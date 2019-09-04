/*
Simple Noise/Film-Grain Shader
- Laird Kruger
*/

THREE.NoiseShader = {

    //uniforms are passed between main JS and shader JS
	uniforms: {

		"tDiffuse": { value: null },      //pixel color passed over by previous shader
		"movement":   { value: 0.0 },     //custom float value
        "intensity":   { value: 0.0 }     //custom float value
	},

	vertexShader: [
        //basic vertex shader: doesn't transform any vertices

		"varying vec2 vUv;",  //varying variable which can be passed between both vertex and fragment shader

		"void main() {",

			"vUv = uv;", //store uv (texture coordinate/vector) in vUv
                         //vUv can now be used to address other pixels colors on the screen eg:
                         //vec4 other_color = texture2D(tDiffuse, vUv + offset);
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );", //vertex position taking into account the world and camera in three js

		"}"

	].join( "\n" ),

	fragmentShader: [

        "uniform sampler2D tDiffuse;",    //pixel color passed over by previous shader
        "uniform float movement;",        //custom float value
        "uniform float intensity;",       //custom float value

        "varying vec2 vUv;",              //variable passed between vertex and fragment shader
        
        "float random( vec2 p ) {",
            "vec2 K1 = vec2(23.14069263277926, 2.665144142690225);",
            "return fract( cos( dot(p,K1) ) * 12345.6789 );",
        "}",

		"void main() {",

            "vec4 color = texture2D( tDiffuse, vUv );",             //sets color (r,g,b,a) of current pixel
            "vec2 uvRandom = vUv;",
            "uvRandom.y *= random( vec2(uvRandom.y,movement) );",   //gets random value from vec2
            "color.rgb += random( uvRandom ) * intensity;",         //adds value to color channels
            "gl_FragColor = vec4( color );",                        //set pixel's final color

		"}"

	].join( "\n" )

};
