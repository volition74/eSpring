{
    // Importing object bases (CompBase, LayerBase, PropertyBase)
    // Creating a new composition object from CompBase
    spring(options, time = thisLayer.time) {
        // Setting the default options
        const { mass = 1, stiffness = 100, damping = 10, initialVelocity = 0, property = thisProperty, __fast = false, ...invalidProps } = options || {};
        // If incorrect properties are passed in as options,
        // we let the user know
        const invalidPropNames = Object.getOwnPropertyNames(invalidProps);
        if (invalidPropNames.length !== 0) {
            throw Error(springError(`Invalid option:${list(invalidPropNames)}`));
        }
        // Early returns if there's no animation
        if (property.numKeys == 0)
            return property.value;
        if (property.numKeys == 1)
            return property.key(1).value;
        // If we're before the second keyframe, no need to animate
        // so return they key value
        if (time < property.key(2).time) {
            return property.key(1).value;
        }
        // The relevant keyframes according to the current time
        const currentKeyIndex = getMostRecentKeyIndex();
        const startKey = property.key(currentKeyIndex - 1);
        const endKey = property.key(currentKeyIndex);
        // Calculate the animation
        const springedProgress = getSpringedProgress(time - endKey.time, {
            damping,
            stiffness,
            mass,
            initialVelocity,
        });
        function getPrevAnimationEndValue() {
            if (__fast || property.numKeys < 3 || time < property.key(3).time) {
                // There's no previous animation, so return
                // the start value
                return startKey.value;
            }
            // Keyframes used in the previous animation
            const prevStartKey = property.key(currentKeyIndex - 2);
            const prevEndKey = property.key(currentKeyIndex - 1);
            // Calculate the result of the previous animation
            // so we can use it as our new starting point
            const prevProgress = getSpringedProgress(endKey.time - startKey.time, {
                damping,
                stiffness,
                mass,
                initialVelocity,
            });
            return calculateAnimatedValue(prevStartKey.value, prevEndKey.value, prevProgress);
        }
        const currentAnimation = calculateAnimatedValue(getPrevAnimationEndValue(), endKey.value, springedProgress);
        return currentAnimation;
        function calculateAnimatedValue(fromValue, toValue, progress) {
            const valueDelta = thisLayer.sub(toValue, fromValue);
            const animatedValueDelta = thisLayer.mul(valueDelta, progress);
            return thisLayer.add(fromValue, animatedValueDelta);
        }
        // Spring resolver
        function getSpringedProgress(progress, spring) {
            const { damping, stiffness, mass, initialVelocity } = spring;
            const w0 = Math.sqrt(stiffness / mass);
            const zeta = damping / (2 * Math.sqrt(stiffness * mass));
            const a = 1;
            // If the damping is too low, we want to calculate the animation differently
            const isUnderDamped = zeta < 1;
            const wd = isUnderDamped ? w0 * Math.sqrt(1 - zeta * zeta) : 0;
            const b = isUnderDamped
                ? (zeta * w0 + -initialVelocity) / wd
                : -initialVelocity + w0;
            if (isUnderDamped) {
                return (1 -
                    Math.exp(-progress * zeta * w0) *
                        (a * Math.cos(wd * progress) + b * Math.sin(wd * progress)));
            }
            else {
                return 1 - (a + b * progress) * Math.exp(-progress * w0);
            }
        }
        function getMostRecentKeyIndex() {
            // Set curKey to the previous keyframe
            if (thisLayer.time < property.key(1).time) {
                return 1;
            }
            const curKey = property.nearestKey(time).index;
            if (property.key(curKey).time > time) {
                return curKey - 1;
            }
            return curKey;
        }
        function springError(...errors) {
            return `in function spring().\n\n${errors.join('\n')}`;
        }
        function list(list) {
            return list.map((item) => `\n- ${item}`);
        }
    },
    version: '1.0.1',
}