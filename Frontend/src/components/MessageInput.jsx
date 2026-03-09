import { useState, useRef } from 'react'

const MessageInput = ({ onSendMessage, isLoading, selectedModel }) => {
  const [message, setMessage] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const fileInputRef = useRef(null)
  const docInputRef = useRef(null)

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('image/')) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image too large! Please select an image smaller than 5MB.')
        return
      }

      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        console.log("Image loaded for analysis:", {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          base64Length: event.target.result.length
        })
        setImagePreview(event.target.result)
      }
      reader.onerror = () => {
        alert('Failed to read image file')
      }
      reader.readAsDataURL(file)
    } else {
      alert('Please select a valid image file')
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      alert('File too large! Please select a file smaller than 10MB.')
      return
    }

    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      console.log("Document loaded for analysis:", {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        base64Length: event.target.result.length
      })
      setFilePreview({
        name: file.name,
        data: event.target.result,
        type: file.type,
        size: file.size
      })
    }
    reader.onerror = () => {
      alert('Failed to read file')
    }
    reader.readAsDataURL(file)
  }

  const handleSend = () => {
    if ((message.trim() || selectedImage || selectedFile) && !isLoading) {
      onSendMessage({ 
        sender: "user", 
        text: message,
        image: imagePreview,
        imageFile: selectedImage,
        file: filePreview
      })
      setMessage('')
      setSelectedImage(null)
      setImagePreview(null)
      setSelectedFile(null)
      setFilePreview(null)
    }
  }

  const handleRemoveImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setFilePreview(null)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="chatgpt-message-input">
      {/* Attachment Previews - ChatGPT Style */}
      {(imagePreview || filePreview) && (
        <div className="attachment-preview-area">
          {imagePreview && (
            <div className="attachment-item image-attachment">
              <div className="attachment-preview">
                <img src={imagePreview} alt="Selected" className="attachment-thumbnail" />
              </div>
              <button 
                className="attachment-remove-btn" 
                onClick={handleRemoveImage} 
                title="Remove image"
                aria-label="Remove image"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}
          
          {filePreview && (
            <div className="attachment-item file-attachment">
              <div className="attachment-file-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                  <polyline points="13 2 13 9 20 9" />
                </svg>
              </div>
              <div className="attachment-file-info">
                <span className="attachment-file-name">{filePreview.name}</span>
                <span className="attachment-file-size">
                  {selectedFile && (selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
              <button 
                className="attachment-remove-btn" 
                onClick={handleRemoveFile} 
                title="Remove file"
                aria-label="Remove file"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Input Area - ChatGPT Style */}
      <div className="chatgpt-input-wrapper">
        <div className="input-controls-left">
          <button 
            className="attachment-btn image-btn"
            onClick={() => fileInputRef.current?.click()} 
            title="Add image"
            disabled={isLoading}
            aria-label="Upload image"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>
          <input 
            ref={fileInputRef} 
            type="file" 
            accept="image/*" 
            onChange={handleImageSelect} 
            style={{display:'none'}} 
            aria-hidden="true"
          />
          
          <button 
            className="attachment-btn file-btn"
            onClick={() => docInputRef.current?.click()} 
            title="Add file"
            disabled={isLoading}
            aria-label="Upload file"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
              <polyline points="13 2 13 9 20 9" />
            </svg>
          </button>
          <input 
            ref={docInputRef} 
            type="file" 
            accept="*/*" 
            onChange={handleFileSelect} 
            style={{display:'none'}} 
            aria-hidden="true"
          />
        </div>
        
        <input 
          type="text" 
          className="chatgpt-message-input-field" 
          placeholder="Message..." 
          value={message} 
          onChange={(e) => setMessage(e.target.value)} 
          onKeyPress={handleKeyPress} 
          disabled={isLoading}
          maxLength={4000}
        />
        
        <button 
          className="send-btn-chatgpt" 
          onClick={handleSend} 
          disabled={isLoading || (!message.trim() && !selectedImage && !selectedFile)} 
          title="Send message"
          aria-label="Send message"
        >
          {isLoading ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20m10-10H2" />
              <animateTransform attributeName="transform" attributeType="XML" type="rotate" from="0 12 12" to="360 12 12" dur="2s" repeatCount="indefinite" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.41,22.99 3.50612381,23.1 4.13399899,22.8429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L4.13399899,1.16151496 C3.34915502,0.9 2.40734225,0.9 1.77946707,1.38954557 C0.994623095,2.02050248 0.837654326,3.0630868 1.15159189,3.84857369 L3.03521743,10.2895666 C3.03521743,10.4466639 3.34915502,10.6037613 3.50612381,10.6037613 L16.6915026,11.3892482 C16.6915026,11.3892482 17.1624089,11.3892482 17.1624089,10.9179561 L17.1624089,12.0000967 C17.1624089,12.4744748 16.6915026,12.4744748 16.6915026,12.4744748 Z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

export default MessageInput
