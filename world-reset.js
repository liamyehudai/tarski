/* global AFRAME, THREE */

/**
 * A-Frame component to reset world orientation and player position.
 *
 * This component listens for a specific button combination (A, B, X, and Y
 * pressed simultaneously) on a VR controller. When triggered, it:
 * 1. Rotates a 'world' entity to match the user's current headset orientation (yaw).
 * 2. Resets a 'player' entity's position to the origin (0, 0, 0).
 *
 * This is useful for allowing users to easily re-calibrate their play space.
 */
AFRAME.registerComponent('world-reset', {
  // Schema defines the configurable properties for the component.
  // This allows us to specify which entities are the player and the world
  // directly from the HTML, making the component more reusable.
  schema: {
    player: {type: 'selector', default: '#player'},
    world: {type: 'selector', default: '#world'}
  },

  /**
   * `init` is a lifecycle method called once when the component is first attached to an entity.
   * We use it to set up initial state and event listeners.
   */
  init: function () {
    // This object will track the current state of each button (true if pressed, false if not).
    this.buttonState = {
      a: false,
      b: false,
      x: false,
      y: false
    };

    // We must bind the functions to the component instance (`this`). This ensures that when
    // they are called by event listeners, `this` refers to the component and not the event object.
    this.onButtonDown = this.onButtonDown.bind(this);
    this.onButtonUp = this.onButtonUp.bind(this);
    this.checkCombination = this.checkCombination.bind(this);

    // Add event listeners to the controller entity that this component is attached to.
    // We listen for both 'down' and 'up' events for each of the four face buttons.
    this.el.addEventListener('abuttondown', () => this.onButtonDown('a'));
    this.el.addEventListener('bbuttondown', () => this.onButtonDown('b'));
    this.el.addEventListener('xbuttondown', () => this.onButtonDown('x'));
    this.el.addEventListener('ybuttondown', () => this.onButtonDown('y'));

    this.el.addEventListener('abuttonup', () => this.onButtonUp('a'));
    this.el.addEventListener('bbuttonup', () => this.onButtonUp('b'));
    this.el.addEventListener('xbuttonup', () => this.onButtonUp('x'));
    this.el.addEventListener('ybuttonup', () => this.onButtonUp('y'));
  },

  /**
   * Updates the state when a button is pressed and then checks if the full combination is met.
   * @param {string} button - The name of the button that was pressed (e.g., 'a', 'b').
   */
  onButtonDown: function (button) {
    this.buttonState[button] = true;
    this.checkCombination();
  },

  /**
   * Updates the state when a button is released.
   * @param {string} button - The name of the button that was released.
   */
  onButtonUp: function (button) {
    this.buttonState[button] = false;
  },

  /**
   * This is the core logic. It checks if all four buttons are pressed and executes the reset.
   */
  checkCombination: function () {
    const { a, b, x, y } = this.buttonState;

    // If all four buttons are currently held down, proceed with the reset logic.
    if (a && b && x && y) {
      console.log('All four buttons pressed! Resetting world orientation and player position.');

      // Get the entities for the player, world, and camera using the selectors from the schema and the scene.
      const player = this.data.player;
      const world = this.data.world;
      const camera = this.el.sceneEl.camera; // The camera entity represents the user's headset.

      // Safety check to ensure all required entities were found in the scene.
      if (!player || !world || !camera) {
        console.error('Could not find player, world, or camera entities. Check your HTML selectors.');
        return;
      }

      // --- World Re-orientation Logic ---
      // 1. Get the camera's current rotation. We only care about the rotation around the Y-axis (yaw),
      //    which represents the direction the user is facing in the horizontal plane.
      const cameraRotation = new THREE.Euler();
      // Get the camera's absolute world rotation as a quaternion. This is the most reliable way to get the headset's true orientation.
      camera.el.object3D.getWorldQuaternion(camera.object3D.quaternion);
      // Convert the quaternion to an Euler angle representation. 'YXZ' order is often best for this purpose.
      cameraRotation.setFromQuaternion(camera.object3D.quaternion, 'YXZ');
      // Convert the resulting yaw angle from radians to degrees for use in A-Frame's setAttribute.
      const yaw = cameraRotation.y * (180 / Math.PI);

      // 2. Apply the calculated yaw to the 'world' entity. This rotates the entire game world
      //    so that its "front" aligns with where the user is currently looking.
      world.setAttribute('rotation', { x: 0, y: yaw, z: 0 });

      // --- Player Position Reset Logic ---
      // 3. Reset the player's position to the world origin (0, 0, 0).
      //    Since the world has just been re-oriented around the player, this effectively re-centers
      //    the player in their physical space relative to the game world.
      player.setAttribute('position', { x: 0, y: 0, z: 0 });

      // 4. Reset the button states. This is a crucial step to prevent this function from firing
      //    on every single frame while the buttons are held down. The user must release and
      //    press the combination again to trigger the action.
      this.buttonState = { a: false, b: false, x: false, y: false };
    }
  }
});
