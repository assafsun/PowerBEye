import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import ForceGraph3D from '3d-force-graph';
import { Workspace, Report, Dataset } from '../../models';
import { Link, Node, NodeType } from '../../models/graphModels';
import SpriteText from 'three-spritetext';
import * as THREE from 'three';

@Component({
  selector: 'lineage-container',
  templateUrl: './lineage-container.component.html',
  styleUrls: ['./lineage-container.component.less']
})
export class LineageContainerComponent implements OnInit {

  public shouldShowGraph = false;
  public workspaces: Workspace[];
  public nodes: Node[] = [];
  public links: Link[] = [];
  public reports: Report[] = [];
  public datasets: Dataset[] = [];

  @ViewChild('filesInput', { static: true }) filesInput: ElementRef;

  constructor() { }

  ngOnInit(): void {

  }

  public onAddFile(): void {
    (this.filesInput.nativeElement as HTMLInputElement).click();
}

  public onFileAdded(): void {
    const files = (this.filesInput.nativeElement as HTMLInputElement).files;

    for (let i = 0 ; i < files.length ; i++) {
      const file = files [i];
      console.log(file);
      const reader = new FileReader();

      reader.addEventListener('load', (event) => {
        this.workspaces = JSON.parse(event.target.result as string).workspaces;
        this.loadLineage();
      });

      reader.readAsText(file);
    }
  }

  private getWorkspaceTextSize(id: string): number {
    const nodeWorkspace = this.workspaces.find(ws => ws.id === id);
    const artifactCount = nodeWorkspace.dashboards.length
    + nodeWorkspace.reports.length
    + nodeWorkspace.datasets.length
    + nodeWorkspace.dataflows.length;

    let textSize = 8;
    if (artifactCount > 10 && artifactCount <= 50) {
      textSize = 16;
    }
    if (artifactCount > 50 && artifactCount <= 100) {
      textSize = 22;
    }
    if (artifactCount > 100) {
      textSize = 30;
    }
    return textSize;
  }

  private getNodeColor(nodeType: NodeType) : string {
    /*
    Report (18, 35, 158, 1)
    Dashboard (25, 114, 120, 1)
    Dataset (201, 79, 15, 1)
    Dataflow (153, 112, 10, 1)
    App (70, 104, 197, 1)
    Workspace (182, 0, 100, 1)
    Workbook (33, 115, 70, 1)
    Data source (116, 78, 194, 1)
    */
    switch (nodeType) {
      case NodeType.Workspace: {
        return 'rgb(255,0,0,1)';
      }
      case NodeType.Dashboard: {
        return 'rgba(25, 114, 120, 1)';
      }
      case NodeType.Report: {
        return 'rgba(18, 35, 158, 1)';
      }
      case NodeType.Dataset: {
        return 'rgba(201, 79, 15, 1)';
      }
      case NodeType.Dataflow: {
        return 'rgba(153, 112, 10, 1)';
      }
      default: {
        return 'rgb(0,0,0,0)';
      }
    }
  }

  private getNodeTypeImage(nodeType: NodeType) : THREE.Mesh {
    let texture = null;

    switch (nodeType) {
      case NodeType.Dashboard: {
        texture = THREE.ImageUtils.loadTexture(`assets/dashboard.png`);
        break;
      }
      case NodeType.Report: {
        texture = THREE.ImageUtils.loadTexture(`assets/report.png`);
        break;
      }
      case NodeType.Dataset: {
        texture = THREE.ImageUtils.loadTexture(`assets/dataset.png`);
        break;
      }
      case NodeType.Dataflow: {
        texture = THREE.ImageUtils.loadTexture(`assets/dataflow.png`);
        break;
      }
      default: {
        texture = THREE.ImageUtils.loadTexture(`assets/data source.png`);
        break;
      }
    }

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(4),
      new THREE.MeshBasicMaterial({
        map: texture
      })
    );

    return sphere;
  }

  private loadLineage(): void {

    // Traversing all workspaces
      for (const workspace of this.workspaces) {
          const workspaceNode: Node = {
            id: workspace.id,
            name: workspace.name,
            type: NodeType.Workspace,
          };
          this.nodes.push(workspaceNode);

          for (const dataset of workspace.datasets) {
            dataset.workspaceId = workspace.id;
            this.datasets.push(dataset);

            const datasetNode: Node = {
              id: dataset.id,
              name: dataset.name,
              type: NodeType.Dataset,
            };
            this.nodes.push(datasetNode);
            this.links.push({
              source: workspaceNode.id,
              target: datasetNode.id
            });

            if (dataset.upstreamDataflows) {
              for (const upstreamDataflow of dataset.upstreamDataflows) {
                if (upstreamDataflow.groupId != dataset.workspaceId) {
                  this.links.push({
                    source: upstreamDataflow.groupId,
                    target: dataset.workspaceId
                  });
                }
              }
            }
          }

          for (const dataflow of workspace.dataflows) {
            dataflow.workspaceId= workspace.id;
            const dataflowNode: Node = {
              id: dataflow.objectId,
              name: dataflow.name,
              type: NodeType.Dataflow,
            };
            this.nodes.push(dataflowNode);
            this.links.push({
              source: workspaceNode.id,
              target: dataflowNode.id
            });

            if (dataflow.upstreamDataflows) {
              for (const upstreamDataflow of dataflow.upstreamDataflows) {
                if (upstreamDataflow.groupId != dataflow.workspaceId) {
                  this.links.push({
                    source: upstreamDataflow.groupId,
                    target: dataflow.workspaceId
                  });
                }
              }
            }
          }

          for (const report of workspace.reports) {
            report.workspaceId = workspace.id;
            report.datasetId = report.datasetId;
            this.reports.push(report);

            const reportNode: Node = {
              id: report.id,
              name: report.name,
              type: NodeType.Report,
            };
            this.nodes.push(reportNode);
            this.links.push({
              source: workspaceNode.id,
              target: reportNode.id
            });
          }

          for (const dashboard of workspace.dashboards) {
            dashboard.workspaceId = workspace.id;
            const dashboardNode: Node = {
              id: dashboard.id,
              name: dashboard.displayName,
              type: NodeType.Dashboard,
            };
            this.nodes.push(dashboardNode);
            this.links.push({
              source: workspaceNode.id,
              target: dashboardNode.id
            });
          }
      }

    // Creating cross workspace connections between Reports and datasets
      for (const report of this.reports) {
      const reportDatasetNode = this.datasets.find(dataset => dataset.id === report.datasetId);
      if (reportDatasetNode) {
        const datasetWorkspaceId = reportDatasetNode.workspaceId;
        if (report.workspaceId !== datasetWorkspaceId) {
          this.links.push({
            source: datasetWorkspaceId,
            target: report.workspaceId
          });
        }
      }
    }

    // Need to clear references to workspaces that weren't encountered
      const validLinks: Link[]=  this.links.filter(link=> this.workspaces.find(workspace => workspace.id === link.source));

      const gData = {
        nodes: this.nodes,
        links: validLinks
      };

      const Graph = ForceGraph3D()
        (document.getElementById('3d-graph'))
          .graphData(gData)
          .onNodeClick((node: any) => {
            if (node.type === NodeType.Workspace) {
              window.open(`https://powerbi-idog.analysis.windows-int.net/groups/${node.id}/lineage`, '_blank');
            }
          })
          .nodeThreeObject((node: any) => {
            if (node.type !== NodeType.Workspace) {
              return this.getNodeTypeImage(node.type as NodeType);
            }

            const sprite = new SpriteText(node.name);
            sprite.material.depthWrite = false; // make sprite background transparent
            sprite.color = 'rgba(255,255,255,0.8)';
            sprite.textHeight = 15;
            return sprite;
          })
          .nodeColor((node: any) => {
            return this.getNodeColor(node.type as NodeType);
          });

      this.shouldShowGraph = true;
  }
}
