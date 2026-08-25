import { NodeData } from '../../types';

export interface NodeProps {
  node: NodeData;
  onUpdate: (id: string, updates: Partial<NodeData>) => void;
  onDelete: () => void;
}
