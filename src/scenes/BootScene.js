import { makeTextures } from '../utils/textures.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    makeTextures(this);
    const profile = this.registry.get('profile');
    // If guest or already completed tutorial, go straight to room
    if (profile.guest || profile.has_completed_tutorial) {
      this.scene.start('Room', { roomId: profile.current_room });
    } else {
      // New player experience: character creation -> tutorial prompt -> optional tutorial
      this.scene.start('NewPlayerExperience');
    }
  }
}
