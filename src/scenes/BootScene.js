import { makeTextures } from '../utils/textures.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    makeTextures(this);
    this.scene.start('Room', { roomId: this.registry.get('profile').current_room });
  }
}
