export interface FlowSelectionIds {
  edges: string[]
  nodes: string[]
}

export const emptyFlowSelection: FlowSelectionIds = {
  edges: [],
  nodes: [],
}

export function areFlowSelectionsEqual(
  first: FlowSelectionIds,
  second: FlowSelectionIds,
) {
  return areIdListsEqual(first.edges, second.edges) &&
    areIdListsEqual(first.nodes, second.nodes)
}

export function toFlowSelectionIds(selection: {
  edges: Array<{ id: string }>
  nodes: Array<{ id: string }>
}): FlowSelectionIds {
  return {
    edges: selection.edges.map((edge) => edge.id),
    nodes: selection.nodes.map((node) => node.id),
  }
}

function areIdListsEqual(first: string[], second: string[]) {
  if (first.length !== second.length) return false

  return first.every((id, index) => id === second[index])
}
