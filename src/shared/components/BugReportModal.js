"use client";

import { useState, useRef } from "react";
import * as Sentry from "@sentry/nextjs";
import Modal from "./Modal";
import Button from "./Button";
import Input from "./Input";
import { useNotificationStore } from "@/store/notificationStore";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function BugReportModal({ isOpen, onClose }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const addNotification = useNotificationStore((s) => s.addNotification);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > MAX_FILE_SIZE) {
      addNotification({
        type: "danger",
        title: "File too large",
        message: "Maximum file size is 5MB",
      });
      return;
    }

    setFile(selected);
    if (selected.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setFilePreview(ev.target.result);
      reader.readAsDataURL(selected);
    } else {
      setFilePreview(null);
    }
  };

  const removeFile = () => {
    setFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    try {
      let attachment = null;
      if (file) {
        const buffer = await file.arrayBuffer();
        attachment = {
          data: new Uint8Array(buffer),
          filename: file.name,
          contentType: file.type || "application/octet-stream",
        };
      }

      const fullMessage = title.trim()
        ? `[Bug Report] ${title.trim()}\n\n${description.trim()}`
        : description.trim();

      Sentry.withScope((scope) => {
        if (attachment) {
          scope.addAttachment(attachment);
        }

        // Send to Sentry User Feedback
        Sentry.captureFeedback(
          {
            message: fullMessage,
            email: email.trim() || undefined,
            name: email.trim() ? email.trim().split("@")[0] : undefined,
          },
          {},
          scope
        );

        // Send to Sentry Issues with attached file
        Sentry.captureMessage(title.trim() ? `User Bug: ${title.trim()}` : "User Bug Report", {
          level: "warning",
          tags: { source: "user_feedback_modal" },
          extra: {
            title: title.trim(),
            description: description.trim(),
            email: email.trim() || "anonymous",
            hasAttachment: Boolean(file),
            attachmentName: file?.name,
            url: typeof window !== "undefined" ? window.location.href : "",
            submittedAt: new Date().toISOString(),
          },
        });
      });

      addNotification({
        type: "success",
        title: "Report sent",
        message: "Thank you! Your bug report and screenshot have been submitted.",
      });

      setTitle("");
      setDescription("");
      setEmail("");
      removeFile();
      onClose();
    } catch (err) {
      console.error("Failed to submit bug report to Sentry:", err);
      addNotification({
        type: "danger",
        title: "Submission failed",
        message: "Could not send report. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Report a Bug" size="md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-xs text-text-muted leading-relaxed">
          Describe what went wrong and attach a screenshot or log file if available.
        </p>

        <Input
          label="Subject"
          placeholder="Brief summary of what went wrong"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={submitting}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-main">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            placeholder="Steps to reproduce, what happened, or error message..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
            className="w-full px-3 py-2 text-sm bg-surface-2 border border-border text-text-main placeholder:text-text-muted focus:outline-none focus:border-brand-500 transition-colors resize-y min-h-[90px]"
          />
        </div>

        {/* Screenshot / File attachment */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-main">
            Attachment / Screenshot (optional)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.log,.txt,.json"
            onChange={handleFileChange}
            className="hidden"
            id="bug-report-file-input"
            disabled={submitting}
          />

          {!file ? (
            <label
              htmlFor="bug-report-file-input"
              className="flex items-center justify-center gap-2 p-3 border border-dashed border-border hover:border-brand-500/60 bg-surface-2/50 hover:bg-surface-2 rounded cursor-pointer transition-colors text-xs text-text-muted hover:text-text-main"
            >
              <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
              <span>Attach screenshot or file (max 5MB)</span>
            </label>
          ) : (
            <div className="flex items-center justify-between p-2 border border-border bg-surface-2 rounded text-xs">
              <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                {filePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={filePreview}
                    alt="Preview"
                    className="size-8 rounded object-cover shrink-0 border border-border"
                  />
                ) : (
                  <span className="material-symbols-outlined text-[20px] text-text-muted shrink-0">
                    attach_file
                  </span>
                )}
                <span className="truncate font-medium text-text-main">{file.name}</span>
                <span className="text-text-muted shrink-0">
                  ({(file.size / 1024).toFixed(0)} KB)
                </span>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="p-1 text-text-muted hover:text-red-500 transition-colors"
                title="Remove file"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          )}
        </div>

        <Input
          label="Contact Email (optional)"
          type="email"
          placeholder="you@example.com (if you want updates)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
        />

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            icon="send"
            loading={submitting}
            disabled={!description.trim()}
          >
            Submit Bug
          </Button>
        </div>
      </form>
    </Modal>
  );
}
