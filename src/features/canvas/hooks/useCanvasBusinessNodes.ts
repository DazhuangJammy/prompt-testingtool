import { useMemo } from 'react'
import type { Dispatch, MouseEvent, PointerEvent, SetStateAction } from 'react'
import { canvasRepository } from '@/features/canvas/infrastructure/canvasRepository'
import {
  createCanvasFlowNodes,
  type CanvasFlowNode,
} from '@/features/canvas/model/canvasFlowMapping'
import type { CanvasGroupLookup } from '@/features/canvas/model/canvasGrouping'
import { expandCanvasNodeIdsByGroups } from '@/features/canvas/model/canvasGrouping'
import type { FlowSelectionIds } from '@/features/canvas/model/flowSelection'
import type { CanvasTextStyle } from '@/features/canvas/model/textStyle'
import type {
  CanvasImageNode,
  CanvasShapeNode,
  CanvasStroke,
  CanvasTextNode,
  DefaultModelSettings,
  InputCard,
  PromptCard,
  ProviderConfig,
} from '@/shared/types'
import type { useCanvasNodePersistence } from './useCanvasNodePersistence'

type NodePersistence = ReturnType<typeof useCanvasNodePersistence>

export function useCanvasBusinessNodes({
  imageNodes,
  inputCards,
  groupLookup,
  nodePersistence,
  onSelectCard,
  onSyncFlowSelection,
  promptCards,
  promptOptimizationProvider,
  promptOptimizationSettings,
  selectedNodeIds,
  setSelectedFlowIds,
  setTextStyle,
  shapeNodes,
  strokes,
  textNodes,
}: {
  imageNodes: CanvasImageNode[]
  inputCards: InputCard[]
  groupLookup: CanvasGroupLookup
  nodePersistence: NodePersistence
  onSelectCard: (id: string) => void
  onSyncFlowSelection: (nodeIds: string[]) => void
  promptCards: PromptCard[]
  promptOptimizationProvider?: ProviderConfig
  promptOptimizationSettings?: DefaultModelSettings
  selectedNodeIds: string[]
  setSelectedFlowIds: Dispatch<SetStateAction<FlowSelectionIds>>
  setTextStyle: Dispatch<SetStateAction<CanvasTextStyle>>
  shapeNodes: CanvasShapeNode[]
  strokes: CanvasStroke[]
  textNodes: CanvasTextNode[]
}): CanvasFlowNode[] {
  return useMemo(
    () => {
      const selectNodeGroup = (
        id: string,
        event?: MouseEvent | PointerEvent,
      ) => {
        void event
        const nodeIds = expandCanvasNodeIdsByGroups([id], groupLookup)
        setSelectedFlowIds({ edges: [], nodes: nodeIds })
        onSyncFlowSelection(nodeIds)
      }

      return createCanvasFlowNodes({
        promptCards,
        selectedNodeIds,
        imageNodes,
        inputCards,
        shapeNodes,
        strokes,
        textNodes,
        onSavePromptCard: (nextCard) => {
          void canvasRepository.savePromptCard(nextCard)
        },
        onSaveInputCard: (nextCard) => {
          void canvasRepository.saveInputCard(nextCard)
        },
        promptOptimizationProvider,
        promptOptimizationSettings,
        onSelectInputCard: (id) => {
          selectNodeGroup(id)
        },
        onSelectPrompt: (id, event) => {
          selectNodeGroup(id, event)
          onSelectCard(id)
        },
        onSelectShape: selectNodeGroup,
        onSelectImage: selectNodeGroup,
        onSelectStroke: selectNodeGroup,
        onSelectText: (id, event) => {
          selectNodeGroup(id, event)
          const selectedText = textNodes.find((node) => node.id === id)
          if (selectedText) {
            setTextStyle({
              backgroundColor: selectedText.backgroundColor,
              color: selectedText.color,
              fontSize: selectedText.fontSize,
            })
          }
        },
        onUpdateImage: nodePersistence.updateImageNode,
        onUpdateShape: nodePersistence.updateShapeNode,
        onUpdateText: nodePersistence.updateTextNode,
      })
    },
    [
      groupLookup,
      imageNodes,
      inputCards,
      nodePersistence.updateImageNode,
      nodePersistence.updateShapeNode,
      nodePersistence.updateTextNode,
      onSelectCard,
      promptCards,
      promptOptimizationProvider,
      promptOptimizationSettings,
      selectedNodeIds,
      onSyncFlowSelection,
      setSelectedFlowIds,
      setTextStyle,
      shapeNodes,
      strokes,
      textNodes,
    ],
  )
}
