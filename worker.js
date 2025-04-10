self.onmessage = function(event) {
    const {o, r, te} = event.data;

    rayDepth = 0;

    // the vector of the ray originating from the camera

    var color = ray(o, r, te);

    // sRGB color correction
    color = linearToSRGB(color);

    // Send the result back to the main thread
    self.postMessage(color);
};

const tolerance = 0.000000000001;
const minimumLightValue = 0.005;
const renderLight = true;
//how many times the ray can bounce
const rayLimit = 16;


var rayDepth;

//default collor for no intersection
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

var mirror = [
    [
        [0, 1, -1],
        [0, 1, 1],
        [0, -1, -1],
        [0, -1, 1]
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
 
var portalRoom = [
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
        [[0, 2, 4], "portal", [[0, 0, 16], [0, 0, 0], [1, 1, 1]], 10],
        [[2, 6, 4], "portal", [[0, 0, 16], [0, 0, 0], [1, 1, 1]], 11],
        [[0, 1, 2], [255, 0, 0]],
        [[1, 3, 2], [255, 0, 0]],
        [[0, 4, 1], [0, 0, 255]],
        [[1, 4, 5], [0, 0, 255]],
        [[4, 6, 5], [255, 127, 0]],
        [[5, 6, 7], [255, 127, 0]],
        [[2, 3, 6], [0, 255, 0]],
        [[3, 7, 6], [0, 255, 0]],
        [[1, 5, 3], "portal", [[0, 0, -16], [0, 0, 0], [1, 1, 1]], 0],
        [[3, 5, 7], "portal", [[0, 0, -16], [0, 0, 0], [1, 1, 1]], 1]
    ],

    [
        [0,0,0],
        [0,0,0]
    ]
];
// list of all objects in scene. anything not in this list will not be rendered.
const objectList = [
    [emptySet, [[0, 0, 0], [0, 0, 0], [0, 0, 0]]], 
    [cube, [[0, 0, 0], [0, 0, 0], [8, 8, 8]]], 
    [cube, [[0, 0, 0], [0, 0, 0], [1, 1, 1]]], 
    [mirror, [[4, -4, 0], [0, 0, -Math.PI/4], [4, 4, 4]]]
];
const lightList = [[-7, 7, 7, 16]];









for(let i=0; i<objectList.length; i++) {
    calculateBoundingVolumes(i);
}










// rendering stuff

function transform(point, transform) {
    var position = transform[0];
    var rotation = transform[1];
    var scale = transform[2];

    var newPoint = [
        point[0]*scale[0],
        point[1]*scale[1],
        point[2]*scale[2]
    ];

    newPoint = rotateVector3(newPoint, rotation);

    newPoint = vector3Add(newPoint, position);

    return newPoint;
}

function calculateBoundingVolumes(i) {
    var objectTransform = objectList[i][1];
    var boxMax = [-Infinity, -Infinity, -Infinity];
    var boxMin = [Infinity, Infinity, Infinity];
    for(let j=0; j<((objectList[i][0][0]).length); j++) {
        for(let k=0; k<3; k++) {
            var point = transform(objectList[i][0][0][j][k], objectTransform);
            if (point > boxMax[k]) {
                boxMax[k] = point;
            }
            if (point < boxMin[k]) {
                boxMin[k] = point;
            }
        }
    }
    objectList[i][0][2] = [boxMin, boxMax];
}

// ray function
function ray(o, r, triangleExclude) 
{
    rayDepth = rayDepth+1;
    // if it goes beyond the limit render magenta
    if (rayDepth > rayLimit) 
    {
        return [255, 0, 255];
    }
    var distCheck = Infinity;
    var nearestTriangle = [0,0];

    // more of gets than checks
    var pointCheck = [0, 0, 0];
    var normalCheck = [0, 0, 0];

    var getTransform;

    // itterates throught objects
    for(let i=1; i<objectList.length; i++) 
    {
        // if it misses the bounding box or hits the bounding box but but its further than the closest dist check
        if (rayBoxIntersection(o,r, objectList[i][0][2]) > distCheck) 
        {
            continue;
        }

        // gets the transform of the object
        var objectTransform = objectList[i][1];

        // itterates throught the triangles of the object
        for(let j=0; j<((objectList[i][0][1]).length); j++) {
            // if a triangle is specified to be excluded, do so
            if ((i == triangleExclude[0])&&(j == triangleExclude[1])){
                continue;
            }
            // Get the coordinates of the triangle's vertices.
            var triangle = [
                transform(objectList[i][0][0][objectList[i][0][1][j][0][0]], objectTransform), // Vertex 1
                transform(objectList[i][0][0][objectList[i][0][1][j][0][1]], objectTransform), // Vertex 2
                transform(objectList[i][0][0][objectList[i][0][1][j][0][2]], objectTransform)  // Vertex 3
            ];
            // get normal vector of the triangle
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
            
            if((dist <= distCheck+tolerance) && (isPointInTriangle(triangle, point))) {
                normalCheck = n;
                pointCheck = [point[0], point[1], point[2]];
                distCheck = dist;
                nearestTriangle = [i,j];
                getTransform = objectTransform;
            }
        }
    }
    switch (objectList[nearestTriangle[0]][0][1][nearestTriangle[1]][1]) {
        case "mirror":
            var triangle = [
                transform(objectList[nearestTriangle[0]][0][0][objectList[nearestTriangle[0]][0][1][nearestTriangle[1]][0][0]], getTransform),
                transform(objectList[nearestTriangle[0]][0][0][objectList[nearestTriangle[0]][0][1][nearestTriangle[1]][0][1]], getTransform),
                transform(objectList[nearestTriangle[0]][0][0][objectList[nearestTriangle[0]][0][1][nearestTriangle[1]][0][2]], getTransform)
            ];
            var reflectedVector = vector3Normalize(reflectVector3(r, normalCheck));
            var color = ray([pointCheck[0]+reflectedVector[0]*tolerance, pointCheck[1]+reflectedVector[1]*tolerance, pointCheck[2]+reflectedVector[2]*tolerance], reflectedVector, nearestTriangle);
            return color;

        case "texture":
            // texture code
            break;

        case "portal":
            return ray(transform(pointCheck, objectList[nearestTriangle[0]][0][1][nearestTriangle[1]][2]), r, [nearestTriangle[0], objectList[nearestTriangle[0]][0][1][nearestTriangle[1]][3]]);

        default:
            var color = objectList[nearestTriangle[0]][0][1][nearestTriangle[1]][1];
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
            
            var objectTransform = objectList[i][1];

            for(let j=0; j<((objectList[i][0][1]).length); j++) {
                if ([i,j] == [triangleExclude[0], triangleExclude[1]]){
                        continue;
                } else {
                    var property = objectList[i][0][1][j][1];

                    if (property === "mirror") {
                        var triangle = [
                            transform(objectList[i][0][0][objectList[i][0][1][j][0][0]], objectTransform), // Vertex 1
                            transform(objectList[i][0][0][objectList[i][0][1][j][0][1]], objectTransform), // Vertex 2
                            transform(objectList[i][0][0][objectList[i][0][1][j][0][2]], objectTransform)  // Vertex 3
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

                    } else if (property === "portal") {
                        var portalTransform = objectList[i][0][1][j][2];
                        var triangle = [
                            transform(objectList[i][0][0][objectList[i][0][1][j][0][0]], objectTransform), // Vertex 1
                            transform(objectList[i][0][0][objectList[i][0][1][j][0][1]], objectTransform), // Vertex 2
                            transform(objectList[i][0][0][objectList[i][0][1][j][0][2]], objectTransform)  // Vertex 3
                        ];
                        var portalLight = vector3Add(lightList[h], vector3Subtract(lightList[h], transform(lightList[h], portalTransform)));
                        var r = vector3Normalize(vector3Subtract(point, portalLight));
                        var n = vector3Normalize(cross(vector3Subtract(triangle[0], triangle[1]), vector3Subtract(triangle[0], triangle[2])));
                        var dotnr = dot(n, r);
                        if ((dotnr <= tolerance) && (dotnr >= -tolerance)) {
                            continue;
                        }
                        var dist = -(dot(n, portalLight)-dot(n, triangle[1]))/dotnr;
                        if (dist <= tolerance) {
                            continue;
                        }
                        var portalPoint = [portalLight[0]+dist*r[0], portalLight[1]+dist*r[1], portalLight[2]+dist*r[2]];
                        if (!isPointInTriangle(triangle, portalPoint)) {
                            continue;
                        }
                        if (shadowCheck(point, vector3Subtract(portalPoint, point), [i, j])) {
                            continue;
                        }
                        var portalPoint2 = transform(portalPoint, portalTransform);
                        if (shadowCheck(portalPoint2, vector3Subtract(lightList[h], portalPoint2), [i, objectList[i][0][1][j][3]])) {
                            continue;
                        }

                        light = light+((lightList[h][3]/(((point[0]-portalLight[0])**2)+((point[1]-portalLight[1])**2)+((point[2]-portalLight[2])**2)))*Math.cos(dot(vector3Normalize(r), normal)));

                    } else {
                        // difuse reflection code
                    }
                }
            }
        }
    }
    return light;
}

function shadowCheck(o, r, triangleExclude) {
    for(let i=0; i<objectList.length; i++) {
        var objectTransform = objectList[i][1];
        if (rayBoxIntersection(o,r, objectList[i][0][2]) > 1) {
            continue;
        }
        for(let j=0; j<((objectList[i][0][1]).length); j++) {
            if ((i == triangleExclude[0]) && (j == triangleExclude[1])){
                continue;
            }
            var triangle = [
                transform(objectList[i][0][0][objectList[i][0][1][j][0][0]], objectTransform), // Vertex 1
                transform(objectList[i][0][0][objectList[i][0][1][j][0][1]], objectTransform), // Vertex 2
                transform(objectList[i][0][0][objectList[i][0][1][j][0][2]], objectTransform)  // Vertex 3
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
    if (mag != 0) {
        var rot;
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

function rightVector3(rotation){
    var sinr0 = Math.sin(rotation[0]);
    var newVector3 = [
        -Math.sin(rotation[1])*sinr0,
        Math.cos(rotation[0]),
        Math.cos(rotation[1])*sinr0
    ];

    var mag = Math.sqrt((newVector3[0]*newVector3[0])+(newVector3[1]*newVector3[1]));
    if (mag != 0) {
        var rot;
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


// to improve


function isPointInTriangle(triangle, point) {
    // Define the vertices of the triangle
    var A = triangle[0];
    var B = triangle[1];
    var C = triangle[2];
    
    // Calculate vectors for the sides of the triangle
    var AB = vector3Subtract(B, A);
    var BC = vector3Subtract(C, B);
    var CA = vector3Subtract(A, C);
    
    // Calculate vectors from the point to the vertices
    var AP = vector3Subtract(point, A);
    var BP = vector3Subtract(point, B);
    var CP = vector3Subtract(point, C);
    
    // Cross products of edge vectors with point vectors
    var cross1 = cross(AB, AP);
    var cross2 = cross(BC, BP);
    var cross3 = cross(CA, CP);
    var cross4 = cross(AB, CA);
    
    // Check the signs of the cross products to determine if the point is on the same side of each edge
    var d1 = Math.sqrt(dot(cross1, cross1)); // Area of the triangle formed by AB and AP
    var d2 = Math.sqrt(dot(cross2, cross2)); // Area of the triangle formed by BC and BP
    var d3 = Math.sqrt(dot(cross3, cross3)); // Area of the triangle formed by CA and CP
    var d4 = Math.sqrt(dot(cross4, cross4)); // Area of the triangle formed by AB and CA
    
    return (d1+d2+d3 <= d4+tolerance);
}

function iCantThinkOfANameForThisFunction(c, s) {
    var sins = Math.sin(s);
    var out;
    if ((sins <= tolerance) && (sins >= -tolerance)) {
        out = 0
    } else {
        out = Math.atan(Math.tan(c)*sins);
    }

    if (Math.cos(c) < 0) {
        var f = Math.PI;
        if (Math.sin(c) < 0) {
            f = -f;
        }
        out = out-f;
    }
    return out;
}

function turnRot3(rotation, turnAngle, turnAmount) {
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
    var cosy = Math.cos(rotation[1]);
    if ((siny <= tolerance) && (siny >= -tolerance)){
        siny = 0;
    }
    if ((cosa <= tolerance) && (cosa >= -tolerance)) {
        p = Math.PI/2;
        s = Math.acos(siny);
        if (sina <= tolerance) {
            s = -s;
        }
        coss = Math.cos(s);
        sins = Math.sin(s);
        if (siny <= tolerance) {
            p = -p;
        }
        if (coss <= tolerance) {
            p = -p;
        }
    } else {
        // var g = Math.atan(siny/cota);
        // s = Math.acos(cosa/Math.cos(g));
        s = Math.acos(cosa/Math.cos(Math.atan(siny/cota)));
        if (sina <= tolerance) {
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
    if ((coss <= tolerance) && (coss >= -tolerance)) {
        coss = 0;
    }
    var b = turnAmount;
    if (coss <= tolerance) {
        p = -p;
        b = -b;
    }
    var q = p;
    var d = b;
    if (sins <= tolerance) {
        b = -b;
        q = -q;
    }
    var newRot3 = [
        Math.acos(Math.cos(iCantThinkOfANameForThisFunction(q+b, s))*coss),
        Math.asin(Math.sin(p+d)*coss),
        iCantThinkOfANameForThisFunction(p+d, s)-iCantThinkOfANameForThisFunction(p, s)
    ];
    if (sins <= tolerance) {
        newRot3[0] = -newRot3[0];
    }
    if (coss <= tolerance) {
        newRot3[1] = -newRot3[1];
        newRot3[2] = -newRot3[2];
    }
 
    newRot3[2] = -newRot3[2];
    newRot3[0] = newRot3[0]-turnAngle;
    newRot3[2] = newRot3[2]+rotation[2];

    if ((cosy <= tolerance) && (cosy >= -tolerance)) {
        // bug fix needed
    }
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