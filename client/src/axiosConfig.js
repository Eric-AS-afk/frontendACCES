import axios from 'axios';

const DEFAULT_API = 'https://api.sienacces.site';
const base = import.meta.env.VITE_API_URL || DEFAULT_API;

axios.defaults.baseURL = base;
axios.defaults.headers.common['Accept'] = 'application/json';

export default axios;
