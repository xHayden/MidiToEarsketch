const fs = require('fs')

/*


<Header Chunk> = <chunk type><length><format><ntrks><division>

Each chunk has a 4-character type and a 32-bit length, which is the number of bytes in the chunk

MTrk <length of track data>
<track data>


*/
let commands = {
    8: {"name": "Note off", args: {"note_number":undefined, "velocity":undefined}},
    9: {"name": "Note on", args: {"note_number":undefined, "velocity":undefined}},
    10: {"name": "Key after-touch", args: {"note_number":undefined, "velocity":undefined}},
    11: {"name": "Control Change", args: {"controller_number":undefined, "new_value":undefined}},
    12: {"name": "Program (patch) change", args: {"new_program_number":undefined}},
    13: {"name": "Channel after-touch", args: {"channel_number":undefined}},
    14: {"name": "Pitch wheel change (2000H is normal or no change)", args: {"bottom":undefined, "top":undefined}},
    0: {"name": "Sets the track's sequence number.", args: {"nn":0x2, "sequence_number":undefined}},
    1: {"name": "Text event- any text you want.", args: {"size":undefined, "text":undefined}},
    2: {"name": "Same as text event, but used for copyright info.", args: {"size":undefined, "text":undefined}},
    3: {"name": "Sequence or Track name", args: {"size":undefined, "text":undefined}},
    4: {"name": "Track instrument name", args: {"size":undefined, "text":undefined}},
    5: {"name": "Lyric", args: {"size":undefined, "text":undefined}},
    6: {"name": "Marker", args: {"size":undefined, "text":undefined}},
    7: {"name": "Cue point", args: {"size":undefined, "text":undefined}},
    47: {"name": "This event must come at the end of each track", args: {}},
    81: {"name": "Set tempo", args: {"microseconds":undefined}},
    88: {"name": "Time Signature", args: {"numerator":undefined, "denominator":undefined, "ticks":undefined, "32ndtoquarter":undefined}},
    89: {"name": "Key signature", args: {"sharps/flats":undefined, "major/minor":undefined}},
    127: {"name": "Sequencer specific information", args: {"n_sent":undefined, "data":undefined}},

}

const MTrk = [0x4D, 0x54, 0x72, 0x6B]
// track_chunk = "MTrk" + <length> + <track_event> [+ <track_event> ...]
// track_event = <v_time> + <midi_event> | <meta_event> | <sysex_event>
// meta_event = 0xFF + <meta_type> + <v_length> + <event_data_bytes>
let track = [...MTrk, ...(new Array(4))]

//console.log(track)
var buf;

function getBytes(buf, n, pointer) {
    s = ""
    for (let i = 0; i < n; i++) {
        s += buf[i + pointer].toString(16)
    }
    return parseInt(s, 16)
}


fs.readFile( __dirname + '/midi/la_camp.mid', 'binary' , (err, data) => {
    if (err) {
      console.error(err)
      return
    }
    
    buf = Buffer.from(data, 'binary');
    
    if (buf.includes("4D546864", 0, "hex")) { //Check for header chunk
        let startOfTrack = (buf.indexOf("4D546864", 0, "hex"))
        let pointer = startOfTrack
        pointer += 4
        let headerLength = getBytes(buf, 4, pointer)
        pointer += 4
        let format = getBytes(buf, 2, pointer)
        switch (format) {
            case 0:
                //single track
                break
            case 1:
                //multi track
                break
            case 2:
                //multiple song (series of type 0 files)
                break
        }
        pointer += 2

        let n = getBytes(buf, 2, pointer)
        pointer += 2

        let division = getBytes(buf, 2, pointer)
        pointer += 2

        header = {"header_length": headerLength, "format": format, "n": n, "division": division}
        console.log(header)
        
    } 
    if (buf.includes("4D54726B", 0, "hex")) { //Check for track chunk
        let startOfTrack = (buf.indexOf("4D54726B", 0, "hex"))
        let pointer = startOfTrack;

        pointer += 4
        let lengthOfTrack = getBytes(buf, 4, pointer)
        //console.log(lengthOfTrack)
        pointer += 4

        let delta_time_found = false
        let delta_time = 0;
        //Most significant bit of each byte is 1 except for the last byte of the number, which has a msb of 0.
        //7 bit bytes
        // 1XXXXXX 1XXXXXX 0XXXXXX <- example
        while (!delta_time_found) {
            if (buf[pointer].toString(2)) {
                delta_time_found = true
                delta_time = buf[pointer]
            }
            else {
                delta_time += buf[pointer] - 128
            }
            pointer += 1
        }
        
        end = false;
        events = []
        while (!end) {
            if (buf[pointer].toString(16).toLowerCase() == "ff") { // Meta command
                pointer += 1
            }
            for (let i in commands) {
                if (i == buf[pointer]) {
                    console.log(events)
                    console.log(commands[i])
                    if (commands[i].name == "This event must come at the end of each track") {
                        end = true;
                        break;
                    }
                    else if (commands[i].name == "Sets the track's sequence number.") {
                        //console.log(commands[i])
                        /*for(let i = 0; i < 16; i++) {
                            console.log(buf[i + pointer])
                        }*/
                        //pointer += 1
                        let sequence_number = getBytes(buf, 2, pointer)
                        pointer += 2
                        let event = {...commands[i]}
                        event.args = {"nn": 0x02, "sequence_number": sequence_number}
                        events.push(event)
                    }
                    else if (commands[i].name == "Text event- any text you want." || commands[i].name == "Sequence or Track name" || commands[i].name == "Same as text event, but used for copyright info.") {
                        for (j in commands[i].args) {
                            if (j == "size") {
                                pointer += 1
                                text = ""
                                let size = getBytes(buf, 1, pointer)
                                pointer += 1
                                for (let i = 0; i < size; i++) {
                                    text += String.fromCharCode(buf[pointer + i])
                                }
                                pointer += size
                                let textCommand = {...commands[i]}
                                textCommand.args = {"size": size, "text": text}
                                events.push(textCommand)
                            }
                        }
                    }
                    else if (commands[i].name == "Set tempo") {
                        pointer++;
                        let tempo = getBytes(buf, 6, pointer)
                        pointer += 6
                        let event = {...commands[i]}
                        event.args = {"microseconds": tempo}
                        events.push(event)
                    }
                    else if (commands[i].name == "Time Signature") {
                        
                        pointer += 2; //Skip 88, identifier of command, and 0x04
                        let num = getBytes(buf, 1, pointer);
                        pointer += 1;
                        let dem = getBytes(buf, 1, pointer);
                        pointer += 1;
                        let cc = getBytes(buf, 2, pointer);
                        pointer += 2;
                        let bb = getBytes(buf, 2, pointer);
                        pointer += 2; //Could be a problem with this. works but I don't know why.
                        let event = {...commands[i]}
                        event.args = {"numerator": num, "denominator": dem, "ticks": cc, "32ndtoquarter": bb}
                        events.push(event)
                       //pointer += 6
                    }
                    else if (commands[i].name == "Key signature") {
                        pointer += 2; //Skip identifier and 02
                        
                        //Signed 8 bit interger for sharps and flats
                        let sharps_flats;
                        if (buf[pointer] > 128) {
                            sharps_flats = 256 - buf[pointer]
                        }
                        else {
                            sharps_flats = buf[pointer]
                        }
                        pointer++;
                        let major_minor = buf[pointer]
                        pointer++;
                        for (let i = 0; i < 16; i++) {
                            console.log(buf[pointer + i])
                            
                        }
                        let event = {...commands[i]}
                        event.args = {"sharps/flats": sharps_flats, "major/minor": major_minor}
                        events.push(event)
                    }
                    
                }
            }
        }
        
        /*for (let i = 0; i < size; i++) {
            console.log(String.fromCharCode(buf[pointer + i]))
            //console.log(buf[i + pointer].toString(16))
            // track_event = <v_time> + <midi_event> | <meta_event> | <sysex_event>
            // meta_event = 0xFF + <meta_type> + <v_length> + <event_data_bytes>
            // v_time is delta time since the last midi event. number of ticks to wait until executing next event.
            // "variable length encoded value. "

            // Midi event
            
            //console.log(getBytes(buf, 1, pointer))


            // Command byte w/ a msb of 1

            
        }*/
    }
    
  })
