export const VERT_SRC = `
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

export const FRAG_SRC = `
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
uniform vec3  u_eye;
uniform vec3  u_fogColor;
uniform vec3  u_lampPositions[10];
uniform float u_lampStrength;
uniform float u_emissive;

void main() {
  vec3 norm = normalize(v_normal);
  vec3 toLight = normalize(-u_lightDir);
  float diff = max(dot(norm, toLight), 0.0);

  vec4 base = u_useTexture ? texture2D(u_texture, v_texCoord) * u_color : u_color;

  vec3 col = u_ambient * base.rgb + diff * u_lightColor * base.rgb;
  vec3 viewDir = normalize(u_eye - v_fragPos);
  for (int i = 0; i < 10; i++) {
    vec3 delta = u_lampPositions[i] - v_fragPos;
    float distanceToLamp = length(delta);
    vec3 lightDir = delta / max(distanceToLamp, 0.001);
    // light cone
    float cone = smoothstep(0.62, 0.91, lightDir.y);
    float attenuation = cone / (1.0 + 0.08 * distanceToLamp + 0.035 * distanceToLamp * distanceToLamp);
    float diffuse = max(dot(norm, lightDir), 0.0);
    vec3 halfDir = normalize(lightDir + viewDir);
    float specular = pow(max(dot(norm, halfDir), 0.0), 24.0) * step(0.001, diffuse);
    col += u_lampStrength * attenuation * vec3(1.0, 0.73, 0.38) * (base.rgb * diffuse + 0.12 * specular);
  }
  col = mix(col, base.rgb * 1.35, clamp(u_emissive, 0.0, 1.0));
  float fog = smoothstep(45.0, 180.0, length(u_eye - v_fragPos));
  col = mix(col, u_fogColor, fog * 0.8);
  gl_FragColor = vec4(col, base.a);
}
`;
