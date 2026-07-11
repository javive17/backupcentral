const axios = require('axios');
const config = require('../config');

let jwtToken = null;
let tokenExpiry = 0;

async function authenticate() {
  if (jwtToken && Date.now() < tokenExpiry) return jwtToken;

  try {
    const res = await axios.post(`${config.portainer.url}/api/auth`, {
      Username: config.portainer.user,
      Password: config.portainer.password,
    });
    jwtToken = res.data.jwt;
    tokenExpiry = Date.now() + 3600000 - 300000;
    return jwtToken;
  } catch (err) {
    throw new Error(`Portainer auth failed: ${err.message}`);
  }
}

async function apiGet(endpoint) {
  const token = await authenticate();
  const res = await axios.get(`${config.portainer.url}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

async function apiPost(endpoint, data = {}) {
  const token = await authenticate();
  const res = await axios.post(`${config.portainer.url}${endpoint}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

async function apiPut(endpoint, data = {}) {
  const token = await authenticate();
  const res = await axios.put(`${config.portainer.url}${endpoint}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

async function getEndpoints() {
  return apiGet('/api/endpoints');
}

async function getStacks() {
  return apiGet('/api/stacks');
}

async function getContainers(endpointId) {
  return apiGet(`/api/endpoints/${endpointId}/docker/containers/json?all=true`);
}

async function getContainerInspect(endpointId, containerId) {
  return apiGet(`/api/endpoints/${endpointId}/docker/containers/${containerId}/json`);
}

async function getContainerLogs(endpointId, containerId, tail = 100) {
  const token = await authenticate();
  const res = await axios.get(
    `${config.portainer.url}/api/endpoints/${endpointId}/docker/containers/${containerId}/logs?stdout=true&stderr=true&tail=${tail}`,
    { headers: { Authorization: `Bearer ${token}` }, responseType: 'text' }
  );
  return res.data;
}

async function stopContainer(endpointId, containerId) {
  const token = await authenticate();
  await axios.post(
    `${config.portainer.url}/api/endpoints/${endpointId}/docker/containers/${containerId}/stop`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

async function startContainer(endpointId, containerId) {
  const token = await authenticate();
  await axios.post(
    `${config.portainer.url}/api/endpoints/${endpointId}/docker/containers/${containerId}/start`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

async function removeContainer(endpointId, containerId, force = false) {
  const token = await authenticate();
  await axios.delete(
    `${config.portainer.url}/api/endpoints/${endpointId}/docker/containers/${containerId}?force=${force}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

async function createContainer(endpointId, config) {
  return apiPost(`/api/endpoints/${endpointId}/docker/containers/create`, config);
}

async function getVolumes(endpointId) {
  return apiGet(`/api/endpoints/${endpointId}/docker/volumes`);
}

async function getNetworks(endpointId) {
  return apiGet(`/api/endpoints/${endpointId}/docker/networks`);
}

async function getImageInspect(endpointId, imageId) {
  return apiGet(`/api/endpoints/${endpointId}/docker/images/${imageId}/json`);
}

module.exports = {
  authenticate,
  getEndpoints,
  getStacks,
  getContainers,
  getContainerInspect,
  getContainerLogs,
  stopContainer,
  startContainer,
  removeContainer,
  createContainer,
  getVolumes,
  getNetworks,
  getImageInspect,
  apiGet,
  apiPost,
  apiPut,
};
