// const texture0 = document.getElementById("texture0");

const canvas = document.getElementById("window");
const ctx = canvas.getContext("2d");
const resolution = 512;
const tolerance = 0.000000001;
const minimumLightValue = 0.005;
const rotationAmount = Math.PI/8;
const renderLight = true;

var playerPos = [-4, 0, 0];
var playerRot = [0, 0, 0];

var emptySet = [
    [
        [0,0,0]
    ], 
    
    [
        [[0,0,0], [0, 0, 0]]
    ],

    [
        [0,0,0],
        [0,0,0]
    ]
];
var testTriangles = [
    [
        [3, 0, -3],
        [3, 0, 3],
        [0, -3, -3],
        [0, -3, 3]
    ], 
    
    [
        [[3,1,0], "mirror"],
        [[3,0,2], "mirror"]
    ],

    [
        [0,0,0],
        [0,0,0]
    ]
];
var cube = [
    [
        [-1, -1, -1],
        [-1, -1, 1],
        [-1, 1, -1],
        [-1, 1, 1],
        [1, -1, -1],
        [1, -1, 1],
        [1, 1, -1],
        [1, 1, 1]
    ],

    [
        [[0, 2, 4], [255, 255, 255]],
        [[2, 6, 4], [255, 255, 255]],
        [[0, 1, 2], [255, 0, 0]],
        [[1, 3, 2], [255, 0, 0]],
        [[0, 4, 1], [0, 0, 255]],
        [[1, 4, 5], [0, 0, 255]],
        [[4, 6, 5], [255, 127, 0]],
        [[5, 6, 7], [255, 127, 0]],
        [[2, 3, 6], [0, 255, 0]],
        [[3, 7, 6], [0, 255, 0]],
        [[1, 5, 3], [255, 255, 0]],
        [[3, 5, 7], [255, 255, 0]]
    ],

    [
        [0,0,0],
        [0,0,0]
    ]
];
var room = [
    [
        [-6, -6, -6],
        [-6, -6, 6],
        [-6, 6, -6],
        [-6, 6, 6],
        [6, -6, -6],
        [6, -6, 6],
        [6, 6, -6],
        [6, 6, 6]
    ],

    [
        [[0, 2, 4], [255, 255, 255]],
        [[2, 6, 4], [255, 255, 255]],
        [[0, 1, 2], [255, 0, 0]],
        [[1, 3, 2], [255, 0, 0]],
        [[0, 4, 1], [0, 0, 255]],
        [[1, 4, 5], [0, 0, 255]],
        [[4, 6, 5], [255, 127, 0]],
        [[5, 6, 7], [255, 127, 0]],
        [[2, 3, 6], [0, 255, 0]],
        [[3, 7, 6], [0, 255, 0]],
        [[1, 5, 3], [255, 255, 0]],
        [[3, 5, 7], [255, 255, 0]]
    ],

    [
        [0,0,0],
        [0,0,0]
    ]
];
const objectList = [emptySet, room, cube, testTriangles];
const lightList = [[-6, 6, 6, 16]];









let inactivityTimeout;

function resetInactivityTimer() {
  // Clear the previous timer (if any)
  if (inactivityTimeout) {
    clearTimeout(inactivityTimeout);
  }
  
  // Set a new timer for 1 second of inactivity
  inactivityTimeout = setTimeout(function() {
    self.close(); 
  }, 1000);
}

onmessage = function(event) {
    postMessage({color:ray(event.o, event.r, event.te)});
};

resetInactivityTimer();








// rendering stuff

function ray(o, r, triangleExclude) {
    var distCheck = Infinity;
    var nearestTriangle = [0,0];
    var pointCheck = [0, 0, 0];
    var normalCheck = [0, 0, 0];
    for(let i=0; i<objectList.length; i++) {
        if (rayBoxIntersection(o,r, objectList[i][2]) > distCheck) {
            continue;
        }
        for(let j=0; j<((objectList[i][1]).length); j++) {
            if ([i,j] == [triangleExclude[0], triangleExclude[1]]){
                continue;
            }
            var triangle = [
                objectList[i][0][objectList[i][1][j][0][0]],
                objectList[i][0][objectList[i][1][j][0][1]],
                objectList[i][0][objectList[i][1][j][0][2]]
            ];
            var n = vector3Normalize(cross(vector3Subtract(triangle[0], triangle[1]), vector3Subtract(triangle[0], triangle[2])));
            var dotnr = dot(n, r);
            if (dotnr == 0) {
                continue;
            }
            var dist = -(dot(n, o)+dot(n, [-triangle[0][0], -triangle[0][1], -triangle[0][2]]))/dotnr;
            if (dist <= 0) {
                continue;
            }
            var point = [o[0]+dist*r[0], o[1]+dist*r[1], o[2]+dist*r[2]];
            if((dist < distCheck) && (isPointInTriangle(triangle, point))) {
                normalCheck = n;
                pointCheck = [point[0], point[1], point[2]];
                distCheck = dist;
                nearestTriangle = [i,j];
            }
        }
    }
    switch (objectList[nearestTriangle[0]][1][nearestTriangle[1]][1]) {
        case "mirror":
            var triangle = [
                objectList[nearestTriangle[0]][0][objectList[nearestTriangle[0]][1][nearestTriangle[1]][0][0]],
                objectList[nearestTriangle[0]][0][objectList[nearestTriangle[0]][1][nearestTriangle[1]][0][1]],
                objectList[nearestTriangle[0]][0][objectList[nearestTriangle[0]][1][nearestTriangle[1]][0][2]]
            ];
            var reflectedVector = vector3Normalize(reflectVector3(r, normalCheck));
            var color = ray([pointCheck[0]+reflectedVector[0]*tolerance, pointCheck[1]+reflectedVector[1]*tolerance, pointCheck[2]+reflectedVector[2]*tolerance], reflectedVector, nearestTriangle);
            return color;

        case "texture":
            var texture = objectList[nearestTriangle[0]][1][nearestTriangle[1]][2];
            var textureCoordinates = objectList[nearestTriangle[0]][1][nearestTriangle[1]][3];
            // ctx.drawImage();
            break;

        default:
            var color = objectList[nearestTriangle[0]][1][nearestTriangle[1]][1];
            if (renderLight){
                var light = calculateLight(pointCheck, normalCheck, [nearestTriangle[0], nearestTriangle[1]]);
                color = [
                    color[0]*light,
                    color[1]*light,
                    color[2]*light
                ];
            }
            return color;
    }
}

function calculateLight(point, normal, triangleExclude){
    var light = 0;
    light = light + directLight(point, normal, triangleExclude);
    light = light + indirectLight(point, normal, triangleExclude);
    return light;
}

function directLight(point, normal, triangleExclude) {
    var light = 0;
    for(let h=0; h<lightList.length; h++) {
        var r = vector3Subtract(lightList[h], point);
        if(!shadowCheck(point, r, triangleExclude)) {
            light = light+((lightList[h][3]/((r[0]*r[0])+(r[1]*r[1])+(r[2]*r[2])))*Math.cos(dot(vector3Normalize(r), normal)));
        }
    }
    if (light < minimumLightValue) {
        light = minimumLightValue;
    }
    return light;
}

function indirectLight(point, normal, triangleExclude) {
    var light = 0;
    for(let h=0; h<lightList.length; h++) {
        for(let i=0; i<objectList.length; i++) {
            for(let j=0; j<((objectList[i][1]).length); j++) {
                if ([i,j] == [triangleExclude[0], triangleExclude[1]]){
                        continue;
                } else if (objectList[i][1][j][1] === "mirror") {
                    var triangle = [
                        objectList[i][0][objectList[i][1][j][0][0]],
                        objectList[i][0][objectList[i][1][j][0][1]],
                        objectList[i][0][objectList[i][1][j][0][2]]
                    ];
                    var n = vector3Normalize(cross(vector3Subtract(triangle[0], triangle[1]), vector3Subtract(triangle[0], triangle[2])));
                    var reflectedLight = vector3Subtract(triangle[0], reflectVector3(vector3Subtract(triangle[0], lightList[h]), n));
                    var dist = Math.sqrt(((reflectedLight[0]-point[0])**2)+((reflectedLight[1]-point[1])**2)+((reflectedLight[2]-point[2])**2));
                    var r = vector3Normalize(vector3Subtract(reflectedLight, point));
                    var distA = (-(dot(n, point)+dot(n, [-triangle[0][0], -triangle[0][1], -triangle[0][2]]))/dot(n, r))-tolerance;
                    var reflectionPoint = [(point[0]+distA*r[0])+(n[0]*tolerance), (point[1]+distA*r[1])+(n[1]*tolerance), (point[2]+distA*r[2])+(n[2]*tolerance)];
                    if(isPointInTriangle(triangle, reflectionPoint)) {
                        if((!shadowCheck(reflectionPoint, vector3Subtract(lightList[h], reflectionPoint), [i,j])) && (!shadowCheck(point, vector3Subtract(reflectionPoint, point), [i,j]))) {
                            light = light+((lightList[h][3]/(dist**2))*Math.cos(dot(vector3Normalize(r), normal)));
                        }
                    }
                } else {
                    // difuse reflection code
                }
            }
        }
    }
    return light;
}


function shadowCheck(o, r, triangleExclude) {
    for(let i=0; i<objectList.length; i++) {
        if (rayBoxIntersection(o,r, objectList[i][2]) > 1) {
            continue;
        }
        for(let j=0; j<((objectList[i][1]).length); j++) {
            if ([i,j] == [triangleExclude[0], triangleExclude[1]]){
                continue;
            }
            var triangle = [
                objectList[i][0][objectList[i][1][j][0][0]],
                objectList[i][0][objectList[i][1][j][0][1]],
                objectList[i][0][objectList[i][1][j][0][2]]
            ];
            var n = vector3Normalize(cross(vector3Subtract(triangle[0], triangle[1]), vector3Subtract(triangle[0], triangle[2])));
            var dotnr = dot(n, r);
            if (dotnr == 0) {
                continue;
            }
            var dist = -(dot(n, o)+dot(n, [-triangle[0][0], -triangle[0][1], -triangle[0][2]]))/dotnr;
            if (dist <= tolerance) {
                continue;
            }
            var point = [o[0]+dist*r[0], o[1]+dist*r[1], o[2]+dist*r[2]];
            if((dist < 1) && (isPointInTriangle(triangle, point))) {
                return true;
            }
        }
    }
    return false;
}

function linearToSRGB(color) {
    if ((color[0]+color[1]+color[2])/3 <= 0.798354) {
        return [
            (color[0]*12.92),
            (color[1]*12.92),
            (color[2]*12.92)
        ];
    } else {
        return [
            ((((((color[0]+1)/256)**(1/2.4))*1.055)-0.055)*255),
            ((((((color[1]+1)/256)**(1/2.4))*1.055)-0.055)*255),
            ((((((color[2]+1)/256)**(1/2.4))*1.055)-0.055)*255)
        ];
    }
}










// math stuff

function cross(a, b){
    return [
        (a[1]*b[2])-(a[2]*b[1]),
        (a[2]*b[0])-(a[0]*b[2]),
        (a[0]*b[1])-(a[1]*b[0])
    ];
}

function dot(a, b){
    return (a[0]*b[0])+(a[1]*b[1])+(a[2]*b[2]);
}

function vector3Subtract(a, b){
    return [
        a[0]-b[0],
        a[1]-b[1],
        a[2]-b[2]
    ];
}

function vector3Add(a, b){
    return [
        a[0]+b[0],
        a[1]+b[1],
        a[2]+b[2]
    ];
}

function vector3Normalize(v) {
    var mag = Math.sqrt((v[0]**2)+(v[1]**2)+(v[2]**2));
    return [
        v[0]/mag,
        v[1]/mag,
        v[2]/mag
    ];
}

function rotToVector3(rot){
    return [
        Math.cos(rot[2])*Math.cos(rot[1]),
        Math.sin(rot[2])*Math.cos(rot[1]),
        Math.sin(rot[1])
    ];
}

function reflectVector3(vector, normal) {
    // formula gotten from the wikipedia page for Specular reflection
    var dot0 = dot(vector, normal);
    return vector3Subtract(vector, [2*normal[0]*dot0, 2*normal[1]*dot0, 2*normal[2]*dot0]);
}

function rotateVector3(vector, rotation){
    var mag = Math.sqrt((vector[1]*vector[1])+(vector[2]*vector[2]));
    var rot = 0;
    if (mag != 0) {
        if (vector[2] > 0) {
            rot = Math.acos(vector[1]/mag);
        } else {
            rot = -Math.acos(vector[1]/mag);
        }
    } else {
        if (vector[2] > 0) {
            rot = Math.acos(vector[1]);
        } else {
            rot = -Math.acos(vector[1]);
        }
    }

    var newVector3 = [
        vector[0],
        Math.cos(rot+rotation[0])*mag,
        Math.sin(rot+rotation[0])*mag
    ];

    mag = Math.sqrt((newVector3[0]*newVector3[0])+(newVector3[2]*newVector3[2]));
    if (newVector3[2] > 0) {
        rot = Math.acos(newVector3[0]/mag);
    } else {
        rot = -Math.acos(newVector3[0]/mag);
    }
    newVector3 = [
        Math.cos(rot+rotation[1])*mag,
        newVector3[1],
        Math.sin(rot+rotation[1])*mag
    ];

    mag = Math.sqrt((newVector3[0]*newVector3[0])+(newVector3[1]*newVector3[1]));
    if (newVector3[1] > 0) {
        rot = Math.acos(newVector3[0]/mag);
    } else {
        rot = -Math.acos(newVector3[0]/mag);
    }
    newVector3 = [
        Math.cos(rot+rotation[2])*mag,
        Math.sin(rot+rotation[2])*mag,
        newVector3[2]
    ];
    
    return newVector3;
}

function upVector3(rotation){
    var cosr0 = Math.cos(rotation[0]);
    var newVector3 = [
        Math.sin(rotation[1])*cosr0,
        Math.sin(rotation[0]),
        Math.cos(rotation[1])*cosr0
    ];

    var mag = Math.sqrt((newVector3[0]*newVector3[0])+(newVector3[1]*newVector3[1]));
    var rot;
    if (mag != 0) {
        if (newVector3[1] > 0) {
            rot = Math.acos(newVector3[0]/mag);
        } else {
            rot = -Math.acos(newVector3[0]/mag);
        }
        newVector3 = [
            Math.cos(rot+rotation[2])*mag,
            Math.sin(rot+rotation[2])*mag,
            newVector3[2]
        ];
    }
    return newVector3;
}

function isPointInTriangle(triangle, point){
    // based on heron's formula
    // wildly ineficient. fix needed
    var sab = vector3Subtract(triangle[0], triangle[1]);
    var sbc = vector3Subtract(triangle[1], triangle[2]);
    var sca = vector3Subtract(triangle[2], triangle[0]);
    var spa = vector3Subtract(triangle[0], point);
    var spb = vector3Subtract(triangle[1], point);
    var spc = vector3Subtract(triangle[2], point);
    var dab = Math.sqrt((sab[0]*sab[0])+(sab[1]*sab[1])+(sab[2]*sab[2]));
    var dbc = Math.sqrt((sbc[0]*sbc[0])+(sbc[1]*sbc[1])+(sbc[2]*sbc[2]));
    var dca = Math.sqrt((sca[0]*sca[0])+(sca[1]*sca[1])+(sca[2]*sca[2]));
    var dap = Math.sqrt((spa[0]*spa[0])+(spa[1]*spa[1])+(spa[2]*spa[2]));
    var dbp = Math.sqrt((spb[0]*spb[0])+(spb[1]*spb[1])+(spb[2]*spb[2]));   
    var dcp = Math.sqrt((spc[0]*spc[0])+(spc[1]*spc[1])+(spc[2]*spc[2])); 
    var sabc = (dab+dbc+dca)/2;
    var spbc = (dbp+dbc+dcp)/2;
    var sapc = (dap+dcp+dca)/2;
    var sabp = (dab+dbp+dap)/2;
    var abc = Math.sqrt(sabc*(sabc-dab)*(sabc-dbc)*(sabc-dca));
    var pbc = Math.sqrt(spbc*(spbc-dbp)*(spbc-dbc)*(spbc-dcp));
    var apc = Math.sqrt(sapc*(sapc-dap)*(sapc-dcp)*(sapc-dca));
    var abp = Math.sqrt(sabp*(sabp-dab)*(sabp-dbp)*(sabp-dap));

    var pabc = pbc+apc+abp;
    
    if (pabc <= abc+tolerance) {
        return true;
    } else {
        return false;
    }
}

function iCantThinkOfANameForThisFunction(c, s) {
    var out = Math.atan(Math.tan(c)*Math.sin(s));
    if (Math.cos(c) < 0) {
        var f = Math.PI;
        if (Math.sin(c) < 0) {
            f = -f;
        }
        out = out-f;
    }
    return out;
}

function turnRot3(rotation, turnAngle) {
    var a = rotation[0]+turnAngle;
    var cosa = Math.cos(a);
    var sina = Math.sin(a);
    var cota;
    if ((sina <= tolerance) && (sina >= -tolerance)) {
        cota = Infinity;
    } else {
        cota = cosa/sina;
    }
    var s;
    var p;
    var coss;
    var sins;
    var siny = Math.sin(rotation[1]);
    if ((cosa <= tolerance) && (cosa >= -tolerance)) {
        p = Math.PI/2;
        s = Math.acos(siny)
        if (sina <= 0) {
            s = -s;
        }
        coss = Math.cos(s);
        sins = Math.sin(s);
        if (siny < 0) {
            p = -p;
        }
        if (coss < 0) {
            p = -p;
        }
    } else {
        // var g = Math.atan(siny/cota);
        // s = Math.acos(cosa/Math.cos(g));
        s = Math.acos(cosa/Math.cos(Math.atan(siny/cota)));
        if (sina <= 0) {
            s = -s;
        }
        coss = Math.cos(s);
        sins = Math.sin(s);
        if ((coss <= tolerance) && (coss >= -tolerance)) {
            p = Math.PI/2;
        } else {
            p = Math.asin(siny/coss);
        }
    }
    var b = rotationAmount;
    if (coss < 0) {
        p = -p;
        b = -b;
    }
    var q = p;
    var d = b;
    if (sins < 0) {
        b = -b;
        q = -q;
    }
    var newRot3 = [
        Math.acos(Math.cos(iCantThinkOfANameForThisFunction(q+b, s))*coss),
        Math.asin(Math.sin(p+d)*coss),
        iCantThinkOfANameForThisFunction(p+d, s)-iCantThinkOfANameForThisFunction(p, s)
    ];
    if (sins < 0) {
        newRot3[0] = -newRot3[0];
    }
    if (coss < 0) {
        newRot3[1] = -newRot3[1];
        newRot3[2] = -newRot3[2];
    }
    newRot3[2] = -newRot3[2];
    newRot3[0] = newRot3[0]-turnAngle;
    newRot3[2] = newRot3[2]+rotation[2];
    return newRot3;
}

function rayBoxIntersection(o, r, box) {
    var rNeg = vector3Subtract([0,0,0], r);
    var Min = vector3Subtract(box[0], o);
    var Max = vector3Subtract(box[1], o);
    Min = [
        Min[0]/r[0],
        Min[1]/r[1],
        Min[2]/r[2]
    ];
    Max = [
        Max[0]/r[0],
        Max[1]/r[1],
        Max[2]/r[2]
    ];
    if (Min[0] > Max[0]) {
        var temp = Max[0];
        Max[0] = Min[0];
        Min[0] = temp;
    }
    if (Min[1] > Max[1]) {
        var temp = Max[1];
        Max[1] = Min[1];
        Min[1] = temp;
    }
    if (Min[2] > Max[2]) {
        var temp = Max[2];
        Max[2] = Min[2];
        Min[2] = temp;
    }
    var Close = Min[0];
    if (Min[1] > Close) {
        Close = Min[1];
    }
    if (Min[2] > Close) {
        Close = Min[2];
    }
    var Far = Max[0];
    if (Max[1] < Far) {
        Far = Max[1];
    }
    if (Max[2] < Far) {
        Far = Max[2];
    }
    if ((Close <= Far+tolerance)) {
        return Close;
    } else {
        return Infinity;
    }
}