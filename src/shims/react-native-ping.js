module.exports = {
  ping: () => Promise.resolve({ receivedPacketLoss: 0, avgRtt: 0 }),
  start: () => Promise.resolve(),
  stop: () => Promise.resolve(),
};
