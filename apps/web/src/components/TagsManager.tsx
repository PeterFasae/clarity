
import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Tag as TagIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNotes } from '../contexts/NotesContext';

interface TagsManagerProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  className?: string;
}

const TagsManager: React.FC<TagsManagerProps> = ({ 
  selectedTags, 
  onChange,
  className = ""
}) => {
  const { getAllTags } = useNotes();
  const [inputValue, setInputValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get all existing tags from the context
  const existingTags = getAllTags();

  // Handle adding a new tag
  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    
    // Don't add empty tags or duplicates
    if (trimmedTag && !selectedTags.includes(trimmedTag)) {
      onChange([...selectedTags, trimmedTag]);
    }
    
    setInputValue('');
    
    // Focus back on input for continuous adding
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Handle removing a tag
  const handleRemoveTag = (tagToRemove: string) => {
    onChange(selectedTags.filter(tag => tag !== tagToRemove));
  };

  // Handle input keydown events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      // Remove the last tag when backspace is pressed and input is empty
      handleRemoveTag(selectedTags[selectedTags.length - 1]);
    }
  };

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // Show suggested tags that aren't already selected
  const suggestedTags = existingTags.filter(
    tag => !selectedTags.includes(tag) && tag.includes(inputValue.toLowerCase())
  );

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Selected tags display */}
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedTags.map(tag => (
          <div 
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-softblue text-xs font-medium"
          >
            <TagIcon className="h-3 w-3" />
            <span>{tag}</span>
            <button
              onClick={() => handleRemoveTag(tag)}
              className="ml-1 h-4 w-4 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors"
              aria-label={`Remove ${tag} tag`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {!isExpanded && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs rounded-full bg-muted hover:bg-muted/80"
            onClick={() => setIsExpanded(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Tag
          </Button>
        )}
      </div>

      {/* Tag input */}
      {isExpanded && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a tag and press Enter"
              className="h-8 text-sm"
              aria-label="Add tag"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleAddTag(inputValue)}
              disabled={!inputValue.trim()}
              className="h-8"
            >
              Add
            </Button>
          </div>

          {/* Tag suggestions */}
          {inputValue && suggestedTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {suggestedTags.slice(0, 5).map(tag => (
                <Button
                  key={tag}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAddTag(tag)}
                  className="h-6 text-xs rounded-full bg-muted hover:bg-muted/80"
                >
                  {tag}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TagsManager;
