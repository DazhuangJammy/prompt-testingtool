import { useMemo } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { canvasRepository } from '@/features/canvas/infrastructure/canvasRepository'
import {
  createCanvasFlowNodes,
  type CanvasFlowNode,
} from '@/features/canvas/model/canvasFlowMapping'
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
  nodePersistence,
  onSelectCard,
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
  nodePersistence: NodePersistence
  onSelectCard: (id: string) => void
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
    () =>
      createCanvasFlowNodes({
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
          setSelectedFlowIds({ edges: [], nodes: [id] })
        },
        onSelectPrompt: onSelectCard,
        onSelectShape: () => undefined,
        onSelectImage: (id) => {
          setSelectedFlowIds({ edges: [], nodes: [id] })
        },
        onSelectText: (id) => {
          setSelectedFlowIds({ edges: [], nodes: [id] })
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
      }),
    [
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
      setSelectedFlowIds,
      setTextStyle,
      shapeNodes,
      strokes,
      textNodes,
    ],
  )
}
