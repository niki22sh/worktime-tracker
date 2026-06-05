# Worktime Tracker — Сервіс обліку робочого часу

> Реалізовано мовою **Node.js** без зовнішніх залежностей — усі дані зберігаються в оперативній пам'яті (In-Memory).

---

## Зміст

1. [Опис проблеми](#1-опис-проблеми)
2. [Актори та сценарії використання](#2-актори-та-сценарії-використання)
3. [Архітектура системи](#3-архітектура-системи)
4. [Доменна модель](#4-доменна-модель)
5. [Патерни проєктування GoF](#5-патерни-проєктування-gof)
6. [Принципи SOLID](#6-принципи-solid)
7. [Бізнес-логіка](#7-бізнес-логіка)
8. [Тестування](#8-тестування)
9. [CI/CD та DevOps](#9-cicd-та-devops)
10. [Метрики якості](#10-метрики-якості)
11. [Структура репозиторію](#11-структура-репозиторію)
12. [Запуск проекту](#12-запуск-проекту)
13. [UML-діаграми](#13-uml-діаграми)

---

## 1. Опис проблеми

### Контекст

Компанія потребує системи обліку робочого часу співробітників.
Поточний процес (паперові табелі або Excel) не дозволяє:

- відслідковувати реальний час приходу та виходу в режимі реального часу;
- автоматично розраховувати понаднормові за різними алгоритмами;
- формувати аналітичні звіти по відділах та окремих працівниках;
- керувати заявками на відпустку з workflow схвалення.

### Що вирішує система

| Проблема | Рішення |
|----------|---------|
| Ручна фіксація часу | Автоматична відмітка приходу/виходу з валідацією |
| Різні алгоритми надурочних | Strategy Pattern — 4 алгоритми, що легко замінюються |
| Відсутність звітності | Щоденні, тижневі, місячні звіти + аналітика |
| Немає workflow відпусток | Повний lifecycle: Pending → Approved/Rejected/Cancelled |
| Дублювання відміток | Захист від подвійного clock-in на рівні бізнес-логіки |
| Перетин відпусток | Автоматична перевірка накладання дат |

---

## 2. Актори та сценарії використання

### Актори

| Актор | Роль | Права |
|-------|------|-------|
| **Employee** (Працівник) | Звичайний співробітник | Clock-in/out, заявки на відпустку, перегляд своїх записів |
| **Manager** (Менеджер) | Керівник відділу | Все вище + схвалення відпусток, коригування записів, звіти |
| **Admin** (Адміністратор) | Системний адміністратор | Все + реєстрація/блокування працівників |

### Ключові сценарії (Use Cases)

**UC-01 — Відмітка приходу (Clock In)**
- Передумова: працівник активний, немає відкритого запису
- Основний сценарій: система створює TimeEntry зі статусом OPEN
- Альтернатива: заблокований → помилка; вже відмічений → помилка

**UC-02 — Відмітка виходу (Clock Out)**
- Передумова: є відкритий запис (OPEN)
- Основний сценарій: запис закривається, розраховується тривалість
- Альтернатива: немає відкритого запису → помилка

**UC-03 — Коригування запису**
- Доступно: Manager/Admin
- Змінює clockIn та clockOut, статус → ADJUSTED (аудит)

**UC-04 — Заявка на відпустку**
- Перевірка: працівник активний, дати не перетинаються з існуючими
- Статус: PENDING до рішення менеджера

**UC-05 — Схвалення/Відхилення відпустки**
- Доступно: Manager/Admin
- Схвалена відпустка враховується в `isOnLeave()`

**UC-06 — Перегляд звітів**
- Щоденний звіт: всі працівники + години за день
- Тижневий звіт: конкретний працівник + понаднормові
- Місячний звіт: підсумок місяця + розрахунок надурочних

**UC-07 — Аналітика**
- Топ-N працівників за годинами
- Пізні приходи (по годині відмітки)
- Довгі робочі дні (понад поріг годин)
- Зведення по відділах

---

## 3. Архітектура системи

### Принцип побудови

Система розділена на 4 чіткі шари. Кожен шар залежить тільки від абстракцій нижнього — ніяких зворотних залежностей.

```
+------------------------------------------------------------------+
|                          Entry Point                             |
|                          src/index.js                            |
+------------------------------------------------------------------+
|                        Services Layer                            |
|   EmployeeService  TimeTrackingService  LeaveService             |
|   ReportService    OvertimeStrategy (GoF: Strategy)              |
|                    EventEmitter      (GoF: Observer)             |
+------------------------------------------------------------------+
|                         Models Layer                             |
|             Employee      TimeEntry      Leave                   |
+------------------------------------------------------------------+
|                        Storage Layer                             |
|   Interfaces:                                                    |
|     IEmployeeRepository  ITimeEntryRepository  ILeaveRepository  |
|   In-Memory implementations:                                     |
|     InMemoryEmployee*    InMemoryTimeEntry*    InMemoryLeave*    |
+------------------------------------------------------------------+
|                          Utils Layer                             |
|          validators    dateUtils    idGenerator                  |
+------------------------------------------------------------------+
```

### Ключові технічні рішення

**Без зовнішніх runtime залежностей** — `package.json` має лише `jest` та `jest-junit` у `devDependencies`. Жодних Express, Mongoose, moment.js або lodash.

**In-Memory сховище** — кожен репозиторій використовує `Map<string, Entity>`. Легко замінити на реальну БД — достатньо написати новий клас, що реалізує інтерфейс.

**Dependency Injection через конструктор** — сервіси отримують репозиторії ззовні, що спрощує тестування та дотримання DIP.

```javascript
const empRepo   = new InMemoryEmployeeRepository();
const timeRepo  = new InMemoryTimeEntryRepository();
const leaveRepo = new InMemoryLeaveRepository();

const employeeService  = new EmployeeService(empRepo);
const timeService      = new TimeTrackingService(timeRepo, empRepo);
const leaveService     = new LeaveService(leaveRepo, empRepo);
const reportService    = new ReportService(timeRepo, empRepo, new TieredOvertimeStrategy());
```

---

## 4. Доменна модель

### Employee (Працівник)

| Поле | Тип | Опис |
|------|-----|------|
| `id` | String | Унікальний ідентифікатор |
| `firstName` / `lastName` | String | Ім'я та прізвище |
| `email` | String | Унікальний email (нормалізується до lowercase) |
| `department` | String | Відділ |
| `role` | `EMPLOYEE` / `MANAGER` / `ADMIN` | Роль |
| `status` | `ACTIVE` / `INACTIVE` / `BLOCKED` | Поточний стан |
| `createdAt` | Date | Дата реєстрації |

### TimeEntry (Запис часу)

| Поле | Тип | Опис |
|------|-----|------|
| `id` | String | Унікальний ідентифікатор |
| `employeeId` | String | FK → Employee |
| `clockIn` | Date | Час приходу |
| `clockOut` | Date / null | Час виходу (null якщо відкритий) |
| `type` | `WORK` / `BREAK` / `OVERTIME` | Тип запису |
| `status` | `OPEN` / `CLOSED` / `ADJUSTED` | Стан запису |
| `note` | String | Примітка |

### Leave (Відпустка)

| Поле | Тип | Опис |
|------|-----|------|
| `id` | String | Унікальний ідентифікатор |
| `employeeId` | String | FK → Employee |
| `type` | `VACATION` / `SICK` / `UNPAID` / `MATERNITY` / `OTHER` | Тип |
| `startDate` / `endDate` | Date | Діапазон відпустки |
| `status` | `PENDING` / `APPROVED` / `REJECTED` / `CANCELLED` | Стан |
| `approvedBy` | String / null | ID менеджера, що ухвалив рішення |

### Бізнес-правила

- Один працівник може мати лише **один відкритий** TimeEntry одночасно
- Заявки на відпустку **не можуть перетинатися** по датах (для PENDING та APPROVED)
- `clockOut` завжди **>= clockIn**, інакше помилка
- Заблокований працівник **не може** виконувати clock-in або подавати заявки

---

## 5. Патерни проєктування GoF

### Strategy — Алгоритми розрахунку понаднормових

**Проблема:** різні підрозділи або юрисдикції мають різні правила оплати надурочних.

**Рішення:** інтерфейс `IOvertimeStrategy` + 4 реалізації, що замінюються без зміни `ReportService`.

| Стратегія | Алгоритм | Результат |
|-----------|----------|-----------|
| `StandardOvertimeStrategy` | Усі понаднормові × 1.5 | overtimeHours, overtimePay |
| `DoubleTimeOvertimeStrategy` | Усі понаднормові × 2.0 | overtimeHours, overtimePay |
| `TieredOvertimeStrategy` | Перші N годин × 1.5, решта × 2.0 | overtimeHours, tier1Hours, tier2Hours, overtimePay |
| `CompTimeOvertimeStrategy` | Грошей не нараховується, лише компенсаційний час | overtimeHours, compTimeHours, overtimePay=0 |

```javascript
// Заміна алгоритму в runtime — ReportService не змінюється
reportService.setOvertimeStrategy(new TieredOvertimeStrategy(2, 1.5, 2.0));
const report = reportService.getWeeklyReport(empId, weekDate, hourlyRate);
```

**Файл:** `src/services/OvertimeStrategy.js`

---

### Observer — Доменні події

**Проблема:** різні модулі (логування, нотифікації, аудит) мають реагувати на зміни в системі без прямих залежностей між ними.

**Рішення:** власний `EventEmitter` (без Node.js core). Сервіси успадковують його та емітують події.

```javascript
employeeService.on('employee:registered', (emp) => {
  console.log(`Новий працівник: ${emp.fullName}`);
});

timeService.on('timeEntry:clockedIn', ({ employee, entry }) => {
  auditLog.write(`${employee.fullName} прийшов о ${entry.clockIn}`);
});
```

**Повний перелік подій:**

| Подія | Коли виникає |
|-------|-------------|
| `employee:registered` | Реєстрація нового працівника |
| `employee:updated` | Оновлення даних |
| `employee:blocked` / `activated` / `deactivated` | Зміна статусу |
| `timeEntry:clockedIn` | Відмітка приходу |
| `timeEntry:clockedOut` | Відмітка виходу |
| `timeEntry:adjusted` | Коригування запису |
| `leave:requested` | Подача заявки |
| `leave:approved` / `rejected` / `cancelled` | Зміна статусу заявки |

**Файл:** `src/utils/EventEmitter.js`

---

## 6. Принципи SOLID

| Принцип | Реалізація в проекті |
|---------|---------------------|
| **S** — Single Responsibility | Кожен сервіс відповідає лише за свою область: `EmployeeService` — CRUD працівників, `TimeTrackingService` — clock-in/out, `ReportService` — лише звіти |
| **O** — Open/Closed | Новий алгоритм надурочних додається як новий клас без зміни `ReportService` |
| **L** — Liskov Substitution | `InMemoryEmployeeRepository` повністю замінюється будь-якою іншою реалізацією `IEmployeeRepository` |
| **I** — Interface Segregation | Кожен репозиторій інтерфейс містить лише методи своєї сутності, без зайвих операцій |
| **D** — Dependency Inversion | Всі сервіси отримують репозиторії через конструктор, залежать від інтерфейсів, а не від конкретних класів |

---

## 7. Бізнес-логіка

### TimeTrackingService

```javascript
timeService.clockIn(employeeId, clockIn?, note?)
timeService.clockOut(employeeId, clockOut?, note?)
timeService.adjustEntry(entryId, clockIn, clockOut, note?)
timeService.isClockedIn(employeeId)                     // boolean
timeService.getEntriesByEmployeeAndDateRange(empId, from, to)
```

### LeaveService

```javascript
leaveService.requestLeave({ employeeId, type, startDate, endDate, reason? })
leaveService.approve(leaveId, approverId)
leaveService.reject(leaveId, approverId)
leaveService.cancel(leaveId)
leaveService.isOnLeave(employeeId, date)                // boolean
leaveService.getTotalApprovedDays(empId, from, to)      // number
```

### ReportService

```javascript
reportService.setOvertimeStrategy(strategy)             // Strategy GoF

reportService.getDailyReport(date)
// → { date, totalEntries, employees: [{ fullName, hoursWorked, isClockedIn }] }

reportService.getWeeklyReport(employeeId, weekDate, hourlyRate?)
// → { workedHours, regularHours, overtime: { overtimeHours, overtimePay } }

reportService.getMonthlyReport(employeeId, year, month, hourlyRate?)
// → { workingDays, regularHours, workedHours, overtime }

reportService.getDepartmentSummary(from, to)
// → [{ department, totalHours, uniqueEmployees }]

reportService.getTopWorkers(from, to, topN?)
reportService.getLateArrivals(from, to, expectedHour?)
reportService.getLongWorkdays(date, threshold?)
```

---

## 8. Тестування

### Статистика

| Показник | Значення |
|----------|---------|
| Всього тестів | **323** |
| Тестових файлів | **13** (12 unit + 1 integration) |
| Файлів вихідного коду | 18 |
| Рядків тестів | ~2 291 |
| Рядків вихідного коду | ~1 870 |

### Покриття коду (фактичне)

| Метрика | Результат | Поріг |
|---------|-----------|-------|
| Statements | **95.22%** | ≥ 70% ✅ |
| Branches | **97.36%** | ≥ 70% ✅ |
| Functions | **86.18%** | ≥ 70% ✅ |
| Lines | **94.89%** | ≥ 70% ✅ |

### Структура тестів

```
tests/
├── unit/
│   ├── validators.test.js          # Валідація вхідних даних
│   ├── dateUtils.test.js           # Утиліти для дат
│   ├── EventEmitter.test.js        # Observer патерн
│   ├── Employee.test.js            # Доменна модель Employee
│   ├── TimeEntry.test.js           # Доменна модель TimeEntry
│   ├── Leave.test.js               # Доменна модель Leave
│   ├── repositories.test.js        # Всі три InMemory репозиторії
│   ├── OvertimeStrategy.test.js    # Всі 4 стратегії надурочних
│   ├── EmployeeService.test.js     # Бізнес-логіка працівників
│   ├── TimeTrackingService.test.js # Бізнес-логіка обліку часу
│   ├── LeaveService.test.js        # Бізнес-логіка відпусток
│   └── ReportService.test.js       # Звіти та аналітика
└── integration/
    └── workflows.test.js           # 12 повних сценаріїв E2E
```

### Інтеграційні сценарії (workflows.test.js)

| # | Сценарій |
|---|----------|
| 1 | Повний робочий день: clock-in → 8 годин → clock-out → звіт |
| 2 | Блокування та відновлення доступу |
| 3 | Lifecycle відпустки: запит → схвалення → isOnLeave() |
| 4 | Тижневий звіт із Tiered overtime strategy |
| 5 | Зведення по відділах для кількох працівників |
| 6 | Коригування запису та перерахунок звіту |
| 7 | Observer: ланцюжок подій у правильному порядку |
| 8 | Рейтинг топ-працівників за кількістю годин |
| 9 | Місячний звіт з акумуляцією всіх записів |
| 10 | Захист від подвійного clock-in |
| 11 | Захист від перетину дат відпусток |
| 12 | Унікальність 20 згенерованих ID |

### Команди

```bash
npm test                  # всі тести + HTML звіт покриття
npm run test:unit         # лише unit тести
npm run test:integration  # лише integration тести
npm run test:ci           # CI режим: junit.xml + cobertura.xml

open coverage/lcov-report/index.html   # HTML звіт по рядках
```

---

## 9. CI/CD та DevOps

### GitHub Actions Pipeline

Файл: `.github/workflows/ci-pipeline.yml`

Кроки при кожному `git push` або Pull Request:

1. **Checkout** — `fetch-depth: 0` для SonarCloud blame data
2. **Setup Node.js 20** — з кешуванням npm
3. **npm ci** — чиста установка залежностей
4. **npm run test:ci** — тести + генерація 4 форматів звітів
5. **upload-artifact** — збереження HTML coverage (30 днів)
6. **upload-artifact** — збереження XML звітів для SonarQube (30 днів)
7. **SonarCloud Scan** — аналіз коду
8. **Quality Gate** — блокує merge якщо не пройдено

### Artifacts (завантажувані результати)

| Artifact | Вміст | Зберігається |
|----------|-------|-------------|
| `coverage-html-report` | Інтерактивний HTML звіт з покриттям по рядках | 30 днів |
| `test-xml-reports` | `junit.xml`, `cobertura-coverage.xml`, `lcov.info` | 30 днів |

### SonarCloud Quality Gate

| Метрика | Поріг |
|---------|-------|
| Code Coverage | ≥ 70% |
| Bugs | 0 |
| Vulnerabilities | 0 |
| Code Smells | Рівень A або B |

Pull Request у `main` **блокується** якщо Quality Gate не пройдено.

### Docker

```bash
docker build -t worktime-tracker .
docker run --rm worktime-tracker   # запускає npm run test:ci
```

---

## 10. Метрики якості

### Розмір кодової бази

| Категорія | Файлів | Рядків |
|-----------|--------|--------|
| Вихідний код (`src/`) | 18     | ~1 870 |
| Тести (`tests/`) | 13     | ~2 291 |
| **Всього** | **40** | **~5 347** |

### Покриття по шарах

| Шар | Statements | Branches | Functions | Lines |
|-----|-----------|----------|-----------|-------|
| `models/` | 100% | 100% | 100% | 100% |
| `services/` | 99.09% | 95.55% | 100% | 99.01% |
| `storage/` (impl) | 100% | 100% | 100% | 100% |
| `utils/` | 98.66% | 97.56% | 96.29% | 98.61% |
| **Загалом** | **95.22%** | **97.36%** | **86.18%** | **94.89%** |

> Interfaces (`IEmployeeRepository` тощо) мають низьке покриття навмисно — вони містять лише `throw new Error('Not implemented')` і призначені лише як контракти.

---

## 11. Структура репозиторію

```
worktime-tracker/
├── src/
│   ├── models/
│   │   ├── Employee.js               # Сутність працівника
│   │   ├── TimeEntry.js              # Сутність запису часу
│   │   └── Leave.js                  # Сутність заявки на відпустку
│   ├── services/
│   │   ├── EmployeeService.js        # Управління працівниками
│   │   ├── TimeTrackingService.js    # Облік часу
│   │   ├── LeaveService.js           # Управління відпустками
│   │   ├── ReportService.js          # Звіти та аналітика
│   │   └── OvertimeStrategy.js       # GoF Strategy — 4 алгоритми
│   ├── storage/
│   │   ├── IEmployeeRepository.js    # Interface
│   │   ├── ITimeEntryRepository.js   # Interface
│   │   ├── ILeaveRepository.js       # Interface
│   │   ├── InMemoryEmployeeRepository.js
│   │   ├── InMemoryTimeEntryRepository.js
│   │   └── InMemoryLeaveRepository.js
│   ├── utils/
│   │   ├── EventEmitter.js           # GoF Observer
│   │   ├── validators.js             # Чисті функції валідації
│   │   ├── dateUtils.js              # Чисті функції для дат
│   │   └── idGenerator.js            # Генерація унікальних ID
│   └── index.js                      # Demo / Entry Point
├── tests/
│   ├── unit/                         # 12 файлів, 300+ тестів
│   └── integration/
│       └── workflows.test.js         # 12 E2E сценаріїв
├── docs/diagrams/                    # 9 UML діаграм
├── .cursor/rules/
│   ├── architecture.md               # AI контекст: архітектура
│   └── testing_strategy.md           # AI контекст: стратегія тестів
├── .github/workflows/
│   └── ci-pipeline.yml               # GitHub Actions пайплайн
├── .cursorrules                       # Глобальні правила для AI агентів
├── sonar-project.properties           # Конфігурація SonarCloud
├── Dockerfile                         # Ізольований запуск тестів
├── package.json                       # Jest конфіг + scripts
└── README.md
```

---

## 12. Запуск проекту

### Вимоги

- Node.js 18+ (рекомендовано 20 LTS)
- npm 9+

### Встановлення

```bash
git clone https://github.com/niki22sh/worktime-tracker.git
cd worktime-tracker
npm install
```

### Команди

```bash
npm start                                     # демонстраційний запуск
npm test                                      # тести + HTML coverage
npm run test:unit                             # лише unit тести
npm run test:integration                      # лише integration тести
npm run test:ci                               # CI режим (junit.xml + cobertura)
open coverage/lcov-report/index.html          # HTML звіт покриття
```

### Демо виводу (`npm start`)

```
[EVENT] Employee registered: Alice Dev
[EVENT] Alice Dev clocked in
[EVENT] Alice Dev clocked out — 9.5h

── Daily Report ──
  Alice Dev: 9.5h
  Bob QA: 8.25h

── Department Summary ──
  Engineering: 9.5h across 1 employees
  QA: 8.25h across 1 employees
```

---

## 13. UML-діаграми

Всі діаграми розташовані в `docs/diagrams/`.

---

## Технічний стек

| Категорія | Технологія |
|-----------|-----------|
| Мова | JavaScript (Node.js 20) |
| Тестовий фреймворк | Jest 29 |
| CI звіти | jest-junit (JUnit XML + Cobertura) |
| Статичний аналіз | SonarCloud |
| CI/CD | GitHub Actions |
| Контейнеризація | Docker |
| Runtime залежності | **відсутні** |

---