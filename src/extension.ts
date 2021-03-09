"use strict";
import { ExtensionContext } from "vscode";
import { GrafanaVSCodeCommands } from "./commands";

export const activate = (context: ExtensionContext) => {
  const grafanaVSCCommands = new GrafanaVSCodeCommands(context);
  context.subscriptions.push(grafanaVSCCommands.initiateWorkspace());
  context.subscriptions.push(grafanaVSCCommands.downloadDashboardJSON());
  context.subscriptions.push(grafanaVSCCommands.uploadDashboardJSON());
};
