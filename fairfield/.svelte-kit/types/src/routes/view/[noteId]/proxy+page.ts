// @ts-nocheck
import type { PageLoad } from './$types';

export const prerender = false;

export const load = async ({ params }: Parameters<PageLoad>[0]) => {
	return {
		noteId: params.noteId
	};
};
