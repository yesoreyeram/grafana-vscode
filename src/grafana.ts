import fetch, { Headers } from "node-fetch";

export class Grafana {
  private headers: Headers;
  constructor(private baseUrl: string, u: string, p: string) {
    const base64credentials = Buffer.from(`${u}:${p}`).toString("base64");
    const authToken = `Basic ${base64credentials}`;
    this.headers = new Headers({
      Authorization: authToken,
      "Content-Type": "application/json",
    });
  }
  private get = (url: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      fetch(`${this.baseUrl}/api${url}`, {
        headers: this.headers,
      })
        .then((response) => response.json())
        .then((json) => {
          if (json && json.message) {
            reject(json.message);
          }
          resolve(json);
        })
        .catch(reject);
    });
  };
  private post = (url: string, body: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      fetch(`${this.baseUrl}/api${url}`, {
        method: "POST",
        body: JSON.stringify(body),
        headers: this.headers,
      })
        .then((response) => response.json())
        .then((json) => {
          if (json && json.message) {
            reject(json.message);
          }
          resolve(json);
        })
        .catch(reject);
    });
  };
  getDashboardsList = (query: string): Promise<any> => {
    const url = `/search?query=${query}&starred=false&skipRecent=false&skipStarred=false&folderIds=0&layout=folders`;
    return new Promise((resolve, reject) => {
      this.get(url).then(resolve).catch(reject);
    });
  };
  getDashboardByUID = (uid: string): Promise<any> => {
    const url = `/dashboards/uid/${uid}`;
    return new Promise((resolve, reject) => {
      this.get(url).then(resolve).catch(reject);
    });
  };
  uploadDashboard = (body: any): Promise<any> => {
    const url = `/dashboards/db`;
    return new Promise((resolve, reject) => {
      this.post(url, body).then(resolve).catch(reject);
    });
  };
}
