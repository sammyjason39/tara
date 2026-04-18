const path = require('path');

// Helper to check arrays for undefined values
function checkArrayForUndefined(arr, name, parentName) {
  if (!Array.isArray(arr)) return;
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    if (item === undefined) {
      console.error(`\n[CRITICAL] Found UNDEFINED at index ${i} in the "${name}" array of ${parentName}`);
      foundUndefined = true;
    } else if (item && item.forwardRef) {
      try {
        const ref = item.forwardRef();
        if (ref === undefined) {
           console.error(`\n[CRITICAL] Found UNDEFINED inside forwardRef() at index ${i} in the "${name}" array of ${parentName}`);
           foundUndefined = true;
        }
      } catch (e) {
         console.error(`\n[CRITICAL] Error calling forwardRef() at index ${i} in the "${name}" array of ${parentName}: ${e.message}`);
         foundUndefined = true;
      }
    } else if (item && typeof item === 'object') {
       // Check Custom Providers
       if ('provide' in item) {
          if ('useClass' in item && item.useClass === undefined) {
             console.error(`\n[CRITICAL] Custom Provider '${item.provide}' in "${name}" array of ${parentName} has useClass: UNDEFINED`);
             foundUndefined = true;
          }
          if ('useFactory' in item && item.useFactory === undefined) {
             console.error(`\n[CRITICAL] Custom Provider '${item.provide}' in "${name}" array of ${parentName} has useFactory: UNDEFINED`);
             foundUndefined = true;
          }
          if ('useValue' in item && item.useValue === undefined) {
             console.error(`\n[CRITICAL] Custom Provider '${item.provide}' in "${name}" array of ${parentName} has useValue: UNDEFINED`);
             foundUndefined = true;
          }
          if ('useExisting' in item && item.useExisting === undefined) {
             console.error(`\n[CRITICAL] Custom Provider '${item.provide}' in "${name}" array of ${parentName} has useExisting: UNDEFINED`);
             foundUndefined = true;
          }
       }
    }
  }
}

// Intercept Reflect.decorate to catch the exact decorator being applied when it contains undefined components
const originalDecorate = Reflect.decorate;
Reflect.decorate = function(decorators, target, key, desc) {
  if (decorators && decorators.length > 0) {
     const metadataKeys = ['imports', 'controllers', 'providers', 'exports'];
     for (const dec of decorators) {
       // Since decorators are closures in Nest, we can't easily inspect their arguments here unless we wrap the @Module decorator.
       // However, NestJS sets metadata during declaration. We will check it after loading.
     }
  }
  return originalDecorate.apply(this, arguments);
};

// Start traversing modules
const visited = new Set();
let foundUndefined = false;

function traverseModule(moduleClass, name) {
  if (!moduleClass) return;
  if (visited.has(moduleClass)) return;
  visited.add(moduleClass);

  const isNestService = Reflect.getMetadata('design:paramtypes', moduleClass);
  // Check constructor injection 
  if (Array.isArray(isNestService)) {
     isNestService.forEach((param, i) => {
        if (param === undefined) {
           console.error(`\n[CRITICAL] Constructor parameter at index ${i} of service ${name} is UNDEFINED. Check its imports and circular dependencies!`);
           foundUndefined = true;
        }
     });
  }

  const moduleName = name || (moduleClass.name || 'UnknownClass');
  
  const imports = Reflect.getMetadata('imports', moduleClass);
  const providers = Reflect.getMetadata('providers', moduleClass);
  const controllers = Reflect.getMetadata('controllers', moduleClass);
  const exportsArr = Reflect.getMetadata('exports', moduleClass);
  
  if (imports) {
     checkArrayForUndefined(imports, 'imports', moduleName);
     if (imports.some(i => i === undefined)) foundUndefined = true;
  }
  if (providers) {
     checkArrayForUndefined(providers, 'providers', moduleName);
     if (providers.some(i => i === undefined)) foundUndefined = true;
  }
  if (controllers) {
     checkArrayForUndefined(controllers, 'controllers', moduleName);
     if (controllers.some(i => i === undefined)) foundUndefined = true;
  }
  if (exportsArr) {
     checkArrayForUndefined(exportsArr, 'exports', moduleName);
     if (exportsArr.some(i => i === undefined)) foundUndefined = true;
  }

  // Iterate sub-modules
  if (Array.isArray(imports)) {
     for (const imp of imports) {
        if (imp && typeof imp === 'function' && !imp.forwardRef) {
           traverseModule(imp, imp.name);
        } else if (imp && imp.forwardRef) {
           try { traverseModule(imp.forwardRef(), imp.forwardRef().name); } catch(e){}
        } else if (imp && imp.module) {
           // dynamic module
           traverseModule(imp.module, imp.module.name);
        }
     }
  }
}

try {
  console.log('Loading app.module.js...');
  const appModuleExports = require('./dist/app.module.js');
  const AppModule = appModuleExports.AppModule;
  
  console.log('Validating AppModule dependencies...');
  traverseModule(AppModule, 'AppModule');

  if (!foundUndefined) {
     console.log('No undefined modules or providers found via metadata reflection.');
  }

} catch (err) {
  console.error('Error loading dist/app.module.js:', err);
}
