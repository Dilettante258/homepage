import { CONTINUE, SKIP, visit } from 'unist-util-visit';
import { toString } from 'hast-util-to-string';
import type { Plugin } from 'unified';
import type { Root, Element, Properties, } from 'hast';
import { createHash } from 'node:crypto';

// Create a hash object
const hash = createHash('md5');

const isHeading = (node: any) => typeof node.type !== undefined && node.tagName === 'h1' ||
    node.tagName === 'h2' || node.tagName === 'h3' || node.tagName === 'h4' || node.tagName === 'h5' || node.tagName === 'h6';


const toStyleString = (style: unknown): string => {
    if (!style) return '';
    if (typeof style === 'string') return style;
    if (Array.isArray(style)) return style.join('; ');

    if (typeof style === 'object') {
        return Object.entries(style as Record<string, unknown>)
            .map(([key, value]) => `${key}: ${value}`)
            .join('; ');
    }

    return '';
};

const setViewTimeline = (properties: Properties, variable: string) => {
    const existing = toStyleString(properties.style)
        .split(';')
        .map((item) => item.trim())
        .filter(Boolean)
        .filter((rule) => !rule.startsWith('view-timeline'));

    existing.push(`view-timeline: ${variable}`);
    properties.style = existing.join('; ');
};

function getShortHash(rawStr: string, hashSet: Set<string>) {
    const hashStr = hash.copy().update(rawStr).digest('base64url').slice(0, 8);
    if (!hashSet.has(hashStr)) {
        hashSet.add(hashStr);
        return hashStr;
    } else {
        return getShortHash(rawStr + 'h', hashSet);
    }
}



const viewTimelinePlugin: Plugin<[], Root> = () => (tree) => {
    let h2Index = 1;
    let hashSet = new Set<string>();

    visit(tree, 'element', (node: Element) => {
        // if (node.type !== 'element') return SKIP;
        const { tagName } = node;
        if (tagName[0] != 'h' || tagName == 'hr') return CONTINUE;
        node.properties ??= {};
        const value = toString(node);
        node.properties.id = getShortHash(value, hashSet);
        if (tagName[1] != '2') return CONTINUE;
        setViewTimeline(node.properties, `--p${h2Index++}`);
        // return SKIP;
        // return CONTINUE;
    });
};

export default viewTimelinePlugin;
