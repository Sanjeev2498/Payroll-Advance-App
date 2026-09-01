export class MockRepository<T> {
  private entities: T[] = [];
  private idCounter = 1;
  
  find = jest.fn().mockImplementation(async (options?: any) => {
    let result = [...this.entities];
    
    if (options?.skip) {
      result = result.slice(options.skip);
    }
    
    if (options?.take) {
      result = result.slice(0, options.take);
    }
    
    return result;
  });
  
  findOne = jest.fn().mockImplementation(async (options?: any) => {
    if (!options?.where) return null;
    
    return this.entities.find(entity => {
      return Object.keys(options.where).every(key => {
        return (entity as any)[key] === options.where[key];
      });
    }) || null;
  });
  
  save = jest.fn().mockImplementation(async (entity: Partial<T>) => {
    if (!(entity as any).id) {
      // Creating new entity
      const newEntity = {
        ...entity,
        id: this.idCounter++,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.entities.push(newEntity as T);
      return newEntity;
    } else {
      // Updating existing entity
      const index = this.entities.findIndex(e => (e as any).id === (entity as any).id);
      if (index !== -1) {
        const updatedEntity = {
          ...this.entities[index],
          ...entity,
          updatedAt: new Date()
        };
        this.entities[index] = updatedEntity;
        return updatedEntity;
      }
      return entity;
    }
  });
  
  create = jest.fn().mockImplementation((entityData: Partial<T>) => {
    return {
      ...entityData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });
  
  update = jest.fn().mockImplementation(async (criteria: any, partialEntity: Partial<T>) => {
    const entities = this.entities.filter(entity => {
      if (typeof criteria === 'object' && criteria !== null) {
        return Object.keys(criteria).every(key => {
          return (entity as any)[key] === criteria[key];
        });
      }
      return (entity as any).id === criteria;
    });
    
    entities.forEach(entity => {
      Object.assign(entity, partialEntity, { updatedAt: new Date() });
    });
    
    return { affected: entities.length };
  });
  
  delete = jest.fn().mockImplementation(async (criteria: any) => {
    const initialLength = this.entities.length;
    
    if (typeof criteria === 'object' && criteria !== null) {
      this.entities = this.entities.filter(entity => {
        return !Object.keys(criteria).every(key => {
          return (entity as any)[key] === criteria[key];
        });
      });
    } else {
      this.entities = this.entities.filter(entity => {
        return (entity as any).id !== criteria;
      });
    }
    
    return { affected: initialLength - this.entities.length };
  });
  
  count = jest.fn().mockImplementation(async () => {
    return this.entities.length;
  });
  
  // Helper methods for test setup
  setEntities(entities: T[]): void {
    this.entities = entities;
  }
  
  getEntities(): T[] {
    return this.entities;
  }
  
  clear(): void {
    this.entities = [];
    this.idCounter = 1;
  }
  
  addEntity(entity: T): void {
    this.entities.push(entity);
  }
}