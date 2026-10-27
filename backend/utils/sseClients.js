// SSE Clients store — tracking.js aur server.js dono use karte hain
const clients = new Set();

const addClient    = (res) => clients.add(res);
const removeClient = (res) => clients.delete(res);

const pushToAdmins = (data) => {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach(res => {
    try { res.write(payload); } catch { clients.delete(res); }
  });
};

module.exports = { addClient, removeClient, pushToAdmins };
