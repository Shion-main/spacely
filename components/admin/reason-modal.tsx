import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface ReasonModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (reason: string) => void
  actionLabel?: string
}

export default function ReasonModal ({ open, onClose, onSubmit, actionLabel = 'Submit' }: ReasonModalProps) {
  const [reason, setReason] = useState('')

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{actionLabel} Listing</DialogTitle>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Optional reason for the owner…"
          className="min-h-[120px]"
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onSubmit(reason.trim()); setReason(''); }}> {actionLabel} </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 