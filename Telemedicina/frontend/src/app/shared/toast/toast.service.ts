import { ApplicationRef, ComponentFactoryResolver, Injectable, Injector } from '@angular/core';
import { CustomToastComponent } from './toast.component';

@Injectable({
  providedIn: 'root'
})

export class ToastService {
  constructor(
    private appRef: ApplicationRef,
    private injector: Injector,
    private cfr: ComponentFactoryResolver
  ) {}

  show(message: string, type: 'success' | 'warning' | 'danger' = 'success') {
    const factory = this.cfr.resolveComponentFactory(CustomToastComponent);
    const componentRef = factory.create(this.injector);

    componentRef.instance.message = message;
    componentRef.instance.type = type;

    this.appRef.attachView(componentRef.hostView);

    const domElem = (componentRef.hostView as any).rootNodes[0] as HTMLElement;
    document.body.appendChild(domElem);

    setTimeout(() => {
      this.appRef.detachView(componentRef.hostView);
      componentRef.destroy();
    }, 3000);
  }
}
