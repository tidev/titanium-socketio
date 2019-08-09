const host = Ti.Platform.osname === 'android' ? '10.0.2.2' : 'localhost';
const port = '3210';
export const url = `http://${host}:${port}`;
