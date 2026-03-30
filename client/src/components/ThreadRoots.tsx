import { useState } from "react";
import { resolveAssetUrl } from "@/lib/utils";

interface Reply {
  id: number;
  authorName: string;
  authorAvatar: string;
  parentId: number | null;
  depth: number;
}

interface ThreadRootsProps {
  replies: Reply[];
  onNodeClick: (replyId: number) => void;
}

// Build a map of parentId -> children
function buildTree(replies: Reply[]) {
  const map = new Map<number | null, Reply[]>();
  for (const reply of replies) {
    const siblings = map.get(reply.parentId) ?? [];
    siblings.push(reply);
    map.set(reply.parentId, siblings);
  }
  return map;
}

function TreeNode({
  reply,
  childMap,
  onNodeClick,
}: {
  reply: Reply;
  childMap: Map<number | null, Reply[]>;
  onNodeClick: (id: number) => void;
}) {
  const children = childMap.get(reply.id) ?? [];

  return (
    <li className="ml-4">
      <button
        type="button"
        onClick={() => onNodeClick(reply.id)}
        className="flex items-center gap-2 py-1 text-sm hover:underline"
      >
        <img
          src={resolveAssetUrl(reply.authorAvatar)}
          alt={reply.authorName}
          className="h-5 w-5 rounded-full"
        />
        <span>{reply.authorName}</span>
      </button>
      {children.length > 0 && (
        <ul className="border-l border-gray-600 pl-2">
          {children.map((child) => (
            <TreeNode
              key={child.id}
              reply={child}
              childMap={childMap}
              onNodeClick={onNodeClick}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function ThreadRoots({ replies, onNodeClick }: ThreadRootsProps) {
  const [open, setOpen] = useState(false);

  // Only render for threads with 10+ replies
  if (replies.length < 10) return null;

  const childMap = buildTree(replies);
  const roots = childMap.get(null) ?? [];

  return (
    <details open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-200">
        Thread tree ({replies.length} replies)
      </summary>
      <ul className="mt-2">
        {roots.map((root) => (
          <TreeNode
            key={root.id}
            reply={root}
            childMap={childMap}
            onNodeClick={onNodeClick}
          />
        ))}
      </ul>
    </details>
  );
}
