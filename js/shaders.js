'use strict';

const VERT_SRC = `
attribute vec3 a_position;
attribute vec2 a_texCoord;
attribute vec3 a_normal;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;
uniform mat3 u_normalMatrix;

varying vec2 v_texCoord;
varying vec3 v_normal;
varying vec3 v_fragPos;

void main() {
  vec4 worldPos = u_model * vec4(a_position, 1.0);
  v_fragPos   = worldPos.xyz;
  v_normal    = u_normalMatrix * a_normal;
  v_texCoord  = a_texCoord;
  gl_Position = u_projection * u_view * worldPos;
}
`;

const FRAG_SRC = `
precision mediump float;

varying vec2 v_texCoord;
varying vec3 v_normal;
varying vec3 v_fragPos;

uniform sampler2D u_texture;
uniform vec3  u_lightDir;
uniform vec3  u_lightColor;
uniform float u_ambient;
uniform bool  u_useTexture;
uniform vec4  u_color;

void main() {
  vec3 norm = normalize(v_normal);
  vec3 toLight = normalize(-u_lightDir);
  float diff = max(dot(norm, toLight), 0.0);

  vec4 base = u_useTexture ? texture2D(u_texture, v_texCoord) : u_color;

  vec3 col = u_ambient * base.rgb + diff * u_lightColor * base.rgb;
  gl_FragColor = vec4(col, base.a);
}
`;
