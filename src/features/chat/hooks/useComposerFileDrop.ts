import { type DragEvent, useRef, useState } from 'react'

interface UseComposerFileDropOptions {
  disabled: boolean
  onFiles: (files: File[]) => void
}

export function useComposerFileDrop({
  disabled,
  onFiles,
}: UseComposerFileDropOptions) {
  const dragDepthRef = useRef(0)
  const [isFileDragging, setIsFileDragging] = useState(false)

  const resetFileDrag = () => {
    dragDepthRef.current = 0
    setIsFileDragging(false)
  }

  const handleDragEnter = (event: DragEvent<HTMLElement>) => {
    if (!hasFileTransfer(event)) return
    event.preventDefault()

    if (disabled) {
      event.dataTransfer.dropEffect = 'none'
      return
    }

    dragDepthRef.current += 1
    event.dataTransfer.dropEffect = 'copy'
    setIsFileDragging(true)
  }

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    if (!hasFileTransfer(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = disabled ? 'none' : 'copy'
  }

  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    if (!hasFileTransfer(event)) return
    event.preventDefault()

    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) setIsFileDragging(false)
  }

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    if (!hasFileTransfer(event)) return
    event.preventDefault()
    resetFileDrag()

    if (disabled) {
      event.dataTransfer.dropEffect = 'none'
      return
    }

    onFiles(Array.from(event.dataTransfer.files))
  }

  return {
    isFileDragging: !disabled && isFileDragging,
    fileDropHandlers: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  }
}

function hasFileTransfer(event: DragEvent<HTMLElement>) {
  return (
    event.dataTransfer.files.length > 0 ||
    Array.from(event.dataTransfer.types).includes('Files')
  )
}
