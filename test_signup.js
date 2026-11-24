const axios = require('axios');

axios.post('http://localhost:3000/auth/signup/start', {
  mobile: '9309430291',
  channel: 'WHATSAPP'
}).then(res => console.log('Success:', res.data))
  .catch(err => console.log('Error:', err.response?.data || err.message));
