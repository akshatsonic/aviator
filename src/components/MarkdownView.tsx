import React from 'react';

interface MarkdownViewProps {
  content: string;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({ content }) => {
  // Parse inline styles like **bold**, `code`, etc.
  const renderInlineFormatted = (text: string) => {
    // Regex splits by bold (**...**) and inline code (`...`)
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return (
          <strong key={index} className="text-white font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        return (
          <code
            key={index}
            className="px-1 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushList = () => {
    if (currentList) {
      if (currentList.type === 'ul') {
        elements.push(
          <ul key={`list-${elements.length}`} className="my-1.5 space-y-1 list-disc pl-4 text-slate-300">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {renderInlineFormatted(item)}
              </li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`list-${elements.length}`} className="my-1.5 space-y-1 list-decimal pl-4 text-slate-300">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {renderInlineFormatted(item)}
              </li>
            ))}
          </ol>
        );
      }
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    // Check for header (e.g. ### Header)
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={`h4-${i}`} className="font-bold text-cyan-300 text-xs mt-2.5 mb-1 tracking-tight">
          {renderInlineFormatted(trimmed.slice(4))}
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={`h3-${i}`} className="font-bold text-white text-sm mt-3 mb-1 tracking-tight">
          {renderInlineFormatted(trimmed.slice(3))}
        </h3>
      );
      continue;
    }

    // Check for unordered bullet list: * item or - item or • item
    const bulletMatch = trimmed.match(/^[\*\-•]\s+(.+)/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      continue;
    }

    // Check for ordered list: 1. item, 2. item
    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)/);
    if (orderedMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(orderedMatch[1]);
      continue;
    }

    // Check for table row (e.g. | col1 | col2 |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList();
      const tableRows: string[][] = [];
      let j = i;
      while (j < lines.length && lines[j].trim().startsWith('|') && lines[j].trim().endsWith('|')) {
        const rowLine = lines[j].trim();
        // Skip separator line (e.g. | :--- | :--- |)
        if (!rowLine.replace(/[\|\:\-\s]/g, '')) {
          j++;
          continue;
        }
        const cells = rowLine
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());
        tableRows.push(cells);
        j++;
      }
      i = j - 1; // Advance outer loop

      if (tableRows.length > 0) {
        const [headers, ...dataRows] = tableRows;
        elements.push(
          <div key={`table-${elements.length}`} className="my-2 overflow-x-auto rounded border border-slate-800 bg-slate-900/60">
            <table className="w-full text-left text-[11px] font-mono border-collapse">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-slate-400">
                  {headers.map((h, hi) => (
                    <th key={hi} className="px-2 py-1 font-semibold text-cyan-300">
                      {renderInlineFormatted(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {dataRows.map((row, ri) => (
                  <tr key={ri} className="hover:bg-slate-800/40">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-2 py-1">
                        {renderInlineFormatted(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // Regular paragraph line
    flushList();
    elements.push(
      <p key={`p-${i}`} className="my-1 leading-relaxed text-slate-200">
        {renderInlineFormatted(trimmed)}
      </p>
    );
  }

  flushList();

  return <div className="space-y-0.5 text-xs">{elements}</div>;
};
