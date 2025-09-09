const express = require('express');
const app = express();
const PORT = 3001;

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'OnTrack Backend API is running',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
});
