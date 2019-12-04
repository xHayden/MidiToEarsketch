'use strict';
var notes = [];
var originalNotes = [];
var velocities = [];
var zeroVelocitiesPos = [];
var scalar = 50; //Scales position
var scalarOverride = 50; //Change if you Scale Changing is off 
var offset = "";
var offsetScalarNum = 1; //Scales length of notes. Usually 1 works. 
var errorCount = 0;
var i;
var scalars = [];
var scalarPos;
var enScCh = true;

var scalarFactor = 10000; //Change this to change scalar, not scalar.


function parseData(data) {
    data = data.split(`\n`);
    var data2 = data;
    var i;
    var x;
    var sorted = [];
    for (x of data2) {
        if (x.indexOf("Tempo") != -1) {
            var j = x.split(" ");
            var tempo = {num: getNumber(j[2]), p: getNumber(j[0])}
            tempo.num = Math.floor((tempo.num / scalarFactor) + 0.5);
            scalars.push(tempo);
        }
    }

    scalar = scalars[0].num;
    console.log(scalars[0].num)
    scalarPos = scalars[0].p;
    for (i of data) {
        if (i.indexOf("n=") != -1) {
            var j = i.split(" ");
            var v = getNumber(j[4]); //velocity
            var p = getNumber(j[0]); //position
            var n = getNumber(j[3]); //note (pitch)
            var packet = {p: p, n: n, v: v}
            sorted.push(packet);
        }
    }
    scalars.sort((a, b) => (a.p > b.p) ? 1 : -1)
    sorted.sort((a, b) => (a.p > b.p) ? 1 : -1)
    //sorted.sort(function (a, b) { return a.p - b.p });
    console.log(sorted);
    for (var i = 0; i < sorted.length; i++) {
        let n = sorted[i].n;
        let p = sorted[i].p;
        let v = sorted[i].v;
        originalNotes[n].push(p);
        if (v > 0) {
            velocities[n].push(v);
            notes[n].push(p);
        }
        else if (v == 0) {
            zeroVelocitiesPos[n].push(p);
        }
    }
}

function turnNotesIntoBeat(noteLine, note) { //NoteLine is all of the positions in one note/pitch
    //console.log(scalar);
    var beat = "";
    var errorThrown = "";
    for (var p = 0; p < noteLine.length; p++) {
        if (enScCh == true) {
            for (var eh = 0; eh < scalars.length; eh++) {
                if (scalars[eh].p > scalarPos && scalars[eh].p > noteLine[p]) {
                    scalarPos = scalars[eh].p;
                    scalar = scalars[eh].num;
                    //console.log("scalar changed " + scalar + " " + scalarPos);
                }
            }
        } else {
            scalar = scalarOverride;
        }

        noteLine[p] /= scalar;
        zeroVelocitiesPos[note][p] /= scalar;
        noteLine[p] = Math.floor(noteLine[p] + 0.5);
        zeroVelocitiesPos[note][p] = Math.floor(zeroVelocitiesPos[note][p] + 0.5);
    }
    if (noteLine.length > 0) {
        for (var i = 0; i < noteLine.length; i++) { //For every note in pitch
            if(noteLine[i-1] != undefined && i != 0){
                var dif = Math.floor(noteLine[i] - noteLine[i-1] + 0.5); //Difference between note potitions of current and previous
            }
            else if(i == 0){
                var dif = noteLine[0] //Difference between note potitions of current and previous if first note
            }
            //Create rests
            for(var j = 0; j < dif - (offset.length + 1); j++){
                beat += "-";
            }
            
            if (noteLine[i] != undefined) {
                //console.log(zeroVelocitiesPos[note][i])
                //console.log(noteLine[i])
                var noteLength = (zeroVelocitiesPos[note][i] - noteLine[i]) //how long the note should play for
                var offsetScale = Math.floor(noteLength/offsetScalarNum + 0.5);
                offset = "";
                for (var x = 0; x < offsetScale; x++) {
                    offset += "+";
                }

                if ((offset.length + 1) > dif) {
                    offset = "";
                    for (var g = 0; g < (dif - 1); g++) { // -1 because of 0
                        offset += "+";
                    }
                    //errorThrown = "Warning. Dif is greater than offset. offset: " + (offset.length + 1) + ". dif: " + dif + ". pitch: " + note + ". \nCurrent note pos: " + originalNotes[note][i] + ". \nNext note pos: " + originalNotes[note][i+1] + ". \nPrevious note pos: " + originalNotes[note][i-1];
                }
                if ((offset.length + 1) > dif) {
                    console.log(offset);
                    errorThrown = "ERROR! Could not change offset to fix length!" + " offset: " + (offset.length + 1) + ". dif: " + dif + ". pitch: " + note + ". \nCurrent note pos: " + originalNotes[note][i] + ". \nNext note pos: " + originalNotes[note][i + 1] + ". \nPrevious note pos: " + originalNotes[note][i - 1];;
                    errorCount++;
                    offset = "";
                }
                if ((offset.length) > dif) {
                    errorCount++;
                    errorThrown = "If you're seeing this, the code is in what I thought was an unreachable state.\nI could give you advice for what to do. But honestly, why should you trust me?\nI clearly screwed this up.\nI'm writing a message that should never appear, yet I know it will probably appear someday.\nOn a deep level, I know I'm not up to this task. I'm so sorry."
                }

                //console.log(Math.floor(velocities[note][i] / offsetScalarNum)) //Current velocity of note
                beat += "0" + offset;
            }
        }
    }
    console.log(errorThrown);
    return beat;
}

function run(data, offsetSc = scalarFactor, disableScaleChanging = true) {
    offset = "";
    errorCount = 0;
    scalars = [];
    for (var i = 0; i < 128; i++) {
        notes[i] = [];
        velocities[i] = [];
        originalNotes[i] = [];
        zeroVelocitiesPos[i] = [];
    }
    scalarFactor = offsetSc;
    parseData(data);
    enScCh = disableScaleChanging;
    for (i in notes) {
        offset = "";
        notes[i] = turnNotesIntoBeat(notes[i], i);
    }
    console.log(errorCount + " errors")
    return JSON.stringify(notes);
}

function getNumber(s) {
    var newS = "";
    for (i of s) {
        if (i >= 0) {
            newS += i;
        }
    }
    return 1 * newS;
}
