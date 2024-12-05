import axios, { AxiosRequestConfig } from "axios";
import qs from "qs";

axios.defaults.paramsSerializer = (params) => qs.stringify(params, { encode: true });

const getAPI = async (config: AxiosRequestConfig = {}) => {
  if (!process.env.REACT_APP_SKIP_AUTH) {
    // const session = await Auth.currentSession();
    // token = session.getIdToken().getJwtToken();
  }
  return axios.create({
    baseURL: process.env.REACT_APP_API_URL,
    ...config,
    headers: {
      "Content-Type": "application/json",
      // Authorization: token && `Bearer ${token}`,
      ...(config.headers || {}),
    },
  });
};

export default getAPI;
