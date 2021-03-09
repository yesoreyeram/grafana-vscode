import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { Grafana } from "./grafana";

export class GrafanaVSCodeCommands {
  constructor(private context: vscode.ExtensionContext) {}
  private setGlobalState = (
    varName: GLOBAL_STATE_VARIABLE,
    value: string | undefined
  ) => {
    this.context.globalState.update(varName, value + "");
  };
  private getGlobalState = (varName: GLOBAL_STATE_VARIABLE): string => {
    return this.context.globalState.get(varName) + "";
  };
  private setGlobalStateFromInput = (
    varName: GLOBAL_STATE_VARIABLE,
    placeHolder: string
  ): Promise<any> => {
    return new Promise((resolve) => {
      vscode.window
        .showInputBox({ placeHolder })
        .then((res) => {
          this.setGlobalState(varName, res);
        })
        .then(resolve);
    });
  };
  getGrafanaEnvironment = (): Grafana => {
    this.context.globalState.setKeysForSync([
      GLOBAL_STATE_VARIABLE.URL,
      GLOBAL_STATE_VARIABLE.USERNAME,
      GLOBAL_STATE_VARIABLE.PASSWORD,
    ]);
    const url = this.getGlobalState(GLOBAL_STATE_VARIABLE.URL);
    const u = this.getGlobalState(GLOBAL_STATE_VARIABLE.USERNAME);
    const p = this.getGlobalState(GLOBAL_STATE_VARIABLE.PASSWORD);
    return new Grafana(url, u, p);
  };
  initiateWorkspace = (): vscode.Disposable => {
    return vscode.commands.registerCommand(
      VSCODE_COMMANDS.INIT_WORKSPACE,
      async () => {
        await this.setGlobalStateFromInput(
          GLOBAL_STATE_VARIABLE.URL,
          "Enter Grafana URL"
        );
        await this.setGlobalStateFromInput(
          GLOBAL_STATE_VARIABLE.USERNAME,
          "Enter username"
        );
        await this.setGlobalStateFromInput(
          GLOBAL_STATE_VARIABLE.PASSWORD,
          "Enter password"
        );
      }
    );
  };
  downloadDashboardJSON = (): vscode.Disposable => {
    return vscode.commands.registerCommand(
      VSCODE_COMMANDS.DASHBOARD_DOWNLOAD,
      async () => {
        const grafana = this.getGrafanaEnvironment();
        const searchQuery = await vscode.window.showInputBox({
          placeHolder: "Enter search text. Leave blank for all dashboards.",
        });
        grafana
          .getDashboardsList(searchQuery + "")
          .then((json: any[]) => {
            const quickPick: vscode.QuickPick<any> = vscode.window.createQuickPick();
            quickPick.placeholder = "Select the dashboard you want to download";
            quickPick.items = json.map((x: any) => ({
              label: x.title,
            }));
            quickPick.onDidChangeSelection(([item]) => {
              const matchingDashboardMeta = json.find(
                (dashboard) => dashboard.title === item.label
              );
              grafana
                .getDashboardByUID(matchingDashboardMeta.uid)
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
          })
          .catch((ex) => {
            vscode.window.showErrorMessage(JSON.stringify(ex));
          });
      }
    );
  };
  uploadDashboardJSON = (): vscode.Disposable => {
    return vscode.commands.registerCommand(
      VSCODE_COMMANDS.DASHBOARD_UPLOAD,
      async () => {
        const grafana = this.getGrafanaEnvironment();
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          let document = editor.document;
          const documentText = document.getText();
          const dashboardContent = JSON.parse(documentText);
          const dashboard = {
            dashboard: dashboardContent.dashboard,
            message: "",
            overwrite: true,
          };
          delete dashboard.dashboard.version;
          grafana
            .uploadDashboard(dashboard)
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
              vscode.window.showErrorMessage(JSON.stringify(ex), {
                modal: true,
              });
            });
        }
      }
    );
  };
}
