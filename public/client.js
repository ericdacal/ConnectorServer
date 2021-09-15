fetch('https://api.npmjs.org/downloads/range/googleapis')
  .then(response => response.json())
  .then(data => console.log(data));