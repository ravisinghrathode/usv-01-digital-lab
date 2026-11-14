/** Shared rule for suspending nonessential canvas animation.
 *  Hidden tabs, background browser windows and reduced-motion sessions are static.
 */
export function shouldAnimateViewport(onscreen: boolean, documentHidden: boolean, reducedMotion: boolean): boolean {
  return onscreen && !documentHidden && !reducedMotion;
}
