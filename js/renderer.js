import { mat4 } from './utils/math.js';

export function initGL(canvas) {
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) { alert('WebGL not supported in this browser.'); return null; }
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  return gl;
}

export function compileShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error('Shader error:', gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

export function createProgram(gl, vertSrc, fragSrc) {
  const v = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  const f = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  const p = gl.createProgram();
  gl.attachShader(p, v); gl.attachShader(p, f);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(p)); return null;
  }
  gl.deleteShader(v); gl.deleteShader(f);
  return p;
}

export function getLocations(gl, program) {
  return {
    // attributes
    a_position:    gl.getAttribLocation(program, 'a_position'),
    a_texCoord:    gl.getAttribLocation(program, 'a_texCoord'),
    a_normal:      gl.getAttribLocation(program, 'a_normal'),
    // uniforms
    u_model:       gl.getUniformLocation(program, 'u_model'),
    u_view:        gl.getUniformLocation(program, 'u_view'),
    u_projection:  gl.getUniformLocation(program, 'u_projection'),
    u_normalMatrix:gl.getUniformLocation(program, 'u_normalMatrix'),
    u_texture:     gl.getUniformLocation(program, 'u_texture'),
    u_lightDir:    gl.getUniformLocation(program, 'u_lightDir'),
    u_lightColor:  gl.getUniformLocation(program, 'u_lightColor'),
    u_ambient:     gl.getUniformLocation(program, 'u_ambient'),
    u_useTexture:  gl.getUniformLocation(program, 'u_useTexture'),
    u_color:       gl.getUniformLocation(program, 'u_color'),
  };
}

export function uploadMesh(gl, geo) {
  function vbo(data) {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    return b;
  }
  function ibo(data) {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data), gl.STATIC_DRAW);
    return b;
  }
  return {
    positionBuf:  vbo(geo.positions),
    texCoordBuf:  vbo(geo.texCoords),
    normalBuf:    vbo(geo.normals),
    indexBuf:     ibo(geo.indices),
    indexCount:   geo.indices.length
  };
}

export function drawMesh(gl, loc, mesh, modelMatrix, texture, color) {
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.positionBuf);
  gl.enableVertexAttribArray(loc.a_position);
  gl.vertexAttribPointer(loc.a_position, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.texCoordBuf);
  gl.enableVertexAttribArray(loc.a_texCoord);
  gl.vertexAttribPointer(loc.a_texCoord, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuf);
  gl.enableVertexAttribArray(loc.a_normal);
  gl.vertexAttribPointer(loc.a_normal, 3, gl.FLOAT, false, 0, 0);

  gl.uniformMatrix4fv(loc.u_model, false, modelMatrix);
  gl.uniformMatrix3fv(loc.u_normalMatrix, false, mat4.normalMatrix(modelMatrix));

  if (texture) {
    gl.uniform1i(loc.u_useTexture, 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(loc.u_texture, 0);
  } else {
    gl.uniform1i(loc.u_useTexture, 0);
    gl.uniform4fv(loc.u_color, color || [1,1,1,1]);
  }

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuf);
  gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
}
