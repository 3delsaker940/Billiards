export class PowerMeter {
  constructor(eventBus, config = {}) {
    this.eventBus = eventBus;
    this.minPower = config.minPower ?? 0.5;
    this.maxPower = config.maxPower ?? 12;

    // ⭐ مدة الدورة الكاملة بالثواني (0 -> 100% -> 0). كل ما زادت الرقم، صار الشريط أبطأ.
    // 2.4 ثانية = وقت كافي جداً للاعب يلحق يثبّت عند القوة يلي بدو ياها.
    this.cycleDuration = config.cycleDuration ?? 2.4;

    this.charging = false;
    this.currentPower = 0;   // القيمة المعروضة والمستخدمة فعلياً (0..1)
    this.elapsed = 0;        // الزمن المنقضي منذ بدء الشحن
  }

  startCharging() {
    this.charging = true;
    this.elapsed = 0;
    this.currentPower = 0;
    this.eventBus.emit('power:start');
  }

  update(deltaTime) {
    if (!this.charging) return;
    this.elapsed += deltaTime;

    // ⭐ موجة جيبية ناعمة بين 0 و 1: بتبلش من الصفر، توصل للقمة (1) بمنتصف الدورة،
    // وترجع تنزل للصفر — مع تباطؤ طبيعي عند الأطراف (القمة والقاع) بفضل خاصية الجيب.
    const t = this.elapsed / this.cycleDuration; // نسبة الزمن (0 = بداية دورة كاملة)
    const angle = t * Math.PI * 2 - Math.PI / 2;  // نبدأ من أسفل الموجة (-π/2 = صفر)
    this.currentPower = (Math.sin(angle) + 1) / 2; // تطبيع النتيجة لتصير بين 0 و 1

    this.eventBus.emit('power:update', { normalized: this.currentPower });
  }

  /** يُستدعى عند ترك الزر — بيرجع القوة الفعلية اللحظية بالضبط لحظة الإفلات */
  release() {
    if (!this.charging) return null;
    this.charging = false;

    const impulseMagnitude = this.minPower + this.currentPower * (this.maxPower - this.minPower);
    this.eventBus.emit('power:release', { impulseMagnitude, normalized: this.currentPower });
    return impulseMagnitude;
  }

  cancel() {
    this.charging = false;
    this.currentPower = 0;
    this.elapsed = 0;
    this.eventBus.emit('power:cancel');
  }
}