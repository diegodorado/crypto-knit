#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

uniform sampler2D u_tex0;
uniform vec2 u_tex0Resolution;

const mat2 m = mat2( 0.80,  0.60, -0.60,  0.80 );
const float PI = 3.1415926535;

float hash( float n )
{
    return fract(sin(n)*43758.5453);
}

float noise( in vec2 x )
{
    vec2 p = floor(x);
    vec2 f = fract(x);

    f = f*f*(3.0-2.0*f);

    float n = p.x + p.y*57.0;

    return mix(mix( hash(n+  0.0), hash(n+  1.0),f.x),
               mix( hash(n+ 57.0), hash(n+ 58.0),f.x),f.y);
}

float fbm( vec2 p )
{
    float f = 0.0;

    f += 0.50000*noise( p ); p = m*p*2.02;
    f += 0.25000*noise( p ); p = m*p*2.03;
    f += 0.12500*noise( p ); p = m*p*2.01;
    f += 0.06250*noise( p ); p = m*p*2.04;
    f += 0.03125*noise( p );

    return f/0.984375;
}

float random (vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898,78.233)))* 43758.5453123);
}

vec2 rotate(vec2 v, float a) {
	float s = sin(a);
	float c = cos(a);
	mat2 m = mat2(c, -s, s, c);
	return m * v;
}

void main() {

  vec2 st = gl_FragCoord.xy/u_resolution;
  vec3 color = vec3(0.0);

  st *= u_tex0Resolution;      // Scale up the space by 3

  //st.x += fbm(st*0.2)*0.5;
  //st.y += fbm(st*0.4)*0.5;
  vec2 _st = fract(st); // Wrap around 1.0
  st.y += 0.5*min(_st.x,1.-_st.x) - 0.125;

  _st = fract(st); // Wrap around 1.0

  vec2 middle = ( floor(st) + vec2(0.5)) / u_tex0Resolution;
  vec4 pixel = texture2D(u_tex0, middle);

  //float _x = smoothstep(0.0, 0.1,_st.x) * (1. - smoothstep(0.4, 0.5,_st.x));
  //_x += smoothstep(0.5, 0.6,_st.x) * (1. - smoothstep(0.9, 1.0,_st.x));
  //float _y = smoothstep(0.0, 0.05,_st.y);
  //_y *= 1. - smoothstep(0.95, 1.0,_st.y);
  float _x = 0.4 +  sqrt(abs(cos(_st.x*PI)*sin(_st.x*PI)));
  float _y = 0.4 +  sqrt(abs(sin(_st.y*PI)));
  color = vec3(0.1) + vec3( _x*_y);

  // add whool fibers effect
  float a = step(0.5,_st.x)* PI * 0.5;
  vec2 fiberDir = rotate(vec2(0.5, 10.0),a);
  float fiber = 0.8 + 0.6* fbm( fiberDir*st );
  //fiber = smoothstep( 0.3, 1.0, fiber );
  color *= vec3(fiber);
  color *= 0.25 + 0.7* fbm( st );
  color *= 0.25 + 0.7* fbm( st * 0.24 );

  gl_FragColor = pixel*vec4(color,1.0);

}
