/* The engine, as one object.
 *
 * These modules used to be loaded by a <script type="module"> that assigned
 * them to window.SUITED, and the app reached them through `this.R`. They are
 * ordinary imports now; this barrel keeps `this.R.adapter.…` reading the way it
 * does throughout the app, so the 21 call sites did not have to be rewritten
 * to prove the port works. */
export * as adapter from './adapter';
export * as ascii from './ascii';
export * as cardView from './card-view';
export * as docsRender from './docs-render';
export * as drawVerify from './draw-verify';
export * as poker from './poker';
export * as sound from './sound';
export * as stakingRender from './staking-render';
export * as token from './token';
export * as verify from './verify';
export * as wallet from './wallet';
