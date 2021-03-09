"use strict";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import fetch, { Headers } from "node-fetch";

const getDashboardsList = (
  url: string,
  username: string,
  password: string,
  searchQuery: string
): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    fetch(
      `${url}/api/search?query=${searchQuery}&starred=false&skipRecent=false&skipStarred=false&folderIds=0&layout=folders`,
      {
        headers: new Headers({
          Authorization:
            "Basic " +
            Buffer.from(`${username}:${password}`).toString("base64"),
          "Content-Type": "application/json",
        }),
      }
    )
      .then((response) => response.json())
      .then((json: any[]) => {
        resolve(json);
      });
  });
};

const getDashboardByUID = (
  url: string,
  username: string,
  password: string,
  uid: string
): Promise<any> => {
  return new Promise((resolve, reject) => {
    fetch(`${url}/api/dashboards/uid/${uid}`, {
      headers: new Headers({
        Authorization:
          "Basic " + Buffer.from(`${username}:${password}`).toString("base64"),
        "Content-Type": "application/json",
      }),
    })
      .then((response) => response.json())
      .then((json: any) => {
        resolve(json);
      });
  });
};

const setDashboardByUID = (
  url: string,
  username: string,
  password: string,
  body: any
): Promise<any> => {
  return new Promise((resolve, reject) => {
    fetch(`${url}/api/dashboards/db`, {
      method: "POST",
      body,
      headers: new Headers({
        Authorization:
          "Basic " + Buffer.from(`${username}:${password}`).toString("base64"),
        "Content-Type": "application/json",
      }),
    })
      .then((response) => response.json())
      .then((json: any) => {
        resolve(json);
      });
  });
};

export const activate = (context: vscode.ExtensionContext) => {
  let initiateWorkspace = vscode.commands.registerCommand(
    "grafana.initiateWorkspace",
    async () => {
      vscode.window
        .showInputBox({
          placeHolder: "Grafana URL. Example: http://example.com:3000",
        })
        .then((res) => {
          context.globalState.update("grafana_url", res);
        })
        .then(() => {
          vscode.window
            .showInputBox({
              placeHolder: "Grafana username",
            })
            .then((res) => {
              context.globalState.update("grafana_username", res);
            })
            .then(() => {
              vscode.window
                .showInputBox({
                  placeHolder: "Grafana password",
                })
                .then((res) => {
                  context.globalState.update("grafana_password", res);
                });
            });
        });
    }
  );
  let downloadDashboardJSON = vscode.commands.registerCommand(
    "grafana.downloadDashboardJSON",
    async () => {
      context.globalState.setKeysForSync([
        "grafana_url",
        "grafana_username",
        "grafana_password",
      ]);
      const url = context.globalState.get("grafana_url") + "";
      const username = context.globalState.get("grafana_username") + "";
      const password = context.globalState.get("grafana_password") + "";
      const searchQuery = await vscode.window.showInputBox({
        placeHolder: "Enter search text. Leave blank for all dashboards.",
      });
      getDashboardsList(url, username, password, searchQuery + "").then(
        (json: any[]) => {
          const quickPick = vscode.window.createQuickPick();
          quickPick.placeholder = "Select the dashboard you want to download";
          quickPick.items = json.map((x: any) => ({
            label: x.title,
          }));
          quickPick.onDidChangeSelection(([item]) => {
            const matchingDashboardMeta = json.find(
              (dashboard) => dashboard.title === item.label
            );
            getDashboardByUID(
              url,
              username,
              password,
              matchingDashboardMeta.uid
            )
              .then((res) => {
                fs.mkdirSync(
                  path.join(vscode.workspace.rootPath + "", "dashboards"),
                  { recursive: true }
                );
                const fName = path.join(
                  vscode.workspace.rootPath + "",
                  "dashboards",
                  res.dashboard.uid + ".json"
                );
                fs.writeFileSync(fName, JSON.stringify(res, null, 4), "utf8");
                var openPath = vscode.Uri.parse("file://" + fName);
                vscode.workspace.openTextDocument(openPath).then((doc) => {
                  vscode.window.showTextDocument(doc);
                });
              })
              .catch((ex) => {
                vscode.window.showErrorMessage(JSON.stringify(ex));
              })
              .finally(() => {
                quickPick.dispose();
              });
          });
          quickPick.onDidHide(() => quickPick.dispose());
          quickPick.show();
        }
      );
    }
  );
  let uploadDashboardJSON = vscode.commands.registerCommand(
    "grafana.uploadDashboardJSON",
    async () => {
      context.globalState.setKeysForSync([
        "grafana_url",
        "grafana_username",
        "grafana_password",
      ]);
      const url: string = context.globalState.get("grafana_url") + "";
      const username: string = context.globalState.get("grafana_username") + "";
      const password: string = context.globalState.get("grafana_password") + "";
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        let document = editor.document;
        const documentText = document.getText();
        const dashboardContent = JSON.parse(documentText);
        console.log(dashboardContent.dashboard);
        const dashboard = {
          dashboard: dashboardContent.dashboard,
          message: "",
          overwrite: true,
        };
        delete dashboard.dashboard.version;
        setDashboardByUID(url, username, password, JSON.stringify(dashboard))
          .then((res) => {
            if (res && res.status === "success") {
              vscode.window.showInformationMessage(
                `Dashboard Uploaded.\n Status : ${res.status}`,
                { modal: true }
              );
            } else {
              vscode.window.showErrorMessage(
                `Dashboard Uploaded failed.\n Status : ${
                  res.message ? res.message : JSON.stringify(res)
                }`,
                { modal: true }
              );
            }
          })
          .catch((ex) => {
            vscode.window.showErrorMessage(JSON.stringify(ex), { modal: true });
          });
      }
    }
  );
  context.subscriptions.push(initiateWorkspace);
  context.subscriptions.push(downloadDashboardJSON);
  context.subscriptions.push(uploadDashboardJSON);
};
