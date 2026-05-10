import { type MessageActionRowComponent, type ActionRow } from 'discord.js';
import React from 'react';
export default function ComponentRow({ row, id }: {
    row: ActionRow<MessageActionRowComponent>;
    id: number;
}): React.JSX.Element;
export declare function Component({ component, id }: {
    component: MessageActionRowComponent;
    id: number;
}): React.JSX.Element | undefined;
