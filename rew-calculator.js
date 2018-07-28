const DEFAULT_SUBMIT_URL = 'https://presale.review.network'
const API_URL = 'https://calculator.review.network'

function handleErrors(response) {
    if (!response.ok) {
        throw response
    }
    return response
}

function throttle(callback, wait, context = this) {
    let timeout = null 
    let callbackArgs = null

    const later = () => {
        callback.apply(context, callbackArgs)
        timeout = null
    }

    return function() {
        if (!timeout) {
            callbackArgs = arguments
            timeout = setTimeout(later, wait)
        }
    }
}

;(() => {
    class RewCalculator {
        constructor (elementOrSelector, { onInit = () => {} }) {
            if (!elementOrSelector) {
                throw Error('Element or selector not passed')
            }

            const container = typeof elementOrSelector === 'string'
                ? document.querySelector(elementOrSelector)
                : elementOrSelector

            this.el = this.createCalculator()

            container.append(this.el)

            this.setupUI()
            this.attachEvents()

            this
                .loadCurrencies()
                .then(() => this.loadCurrentStage())
                .then(() => {
                    this.ui.$inputContainer.classList.add('rc-input--visible')
                    onInit()
                })
        }

        loadCurrencies () {
            return fetch(`${API_URL}/currencies`)
                .then(handleErrors)
                .then(r => r.json())
                .then(r => r.content)
                .then(currencies => {
                    this.ui.$currency.innerHTML = currencies
                        .map(currency => `<option value="${currency}">${currency}</option>`)
                })
        }

        loadCurrentStage () {
            return fetch(`${API_URL}/stage`)
                .then(handleErrors)
                .then(r => r.json())
                .then(r => r.content)
                .then(stage => {
                    this.minInvestments = stage.min_investments
                    let selectedCurrency = this.ui.$currency.value
                    this.ui.$currentStageName.innerHTML = stage.name
                    this.ui.$currentStageDates.innerHTML = new Date(stage.date_from).toLocaleDateString() + ' - ' + new Date(stage.date_to).toLocaleDateString()
                    this.ui.$currentStageMin.innerHTML = `Min. ${this.minInvestments[selectedCurrency]} ${selectedCurrency}`
                    this.ui.$currentStage.classList.add('rc-current-stage--visible')
                })
        }

        createCalculator () {
            let el = document.createElement('div')

            el.innerHTML = this.renderTemplate()

            return el
        }

        renderLoader () {
            return `
                <div class="rc-loader"></div>
            `
        }
        
        renderAmountInput () {
            return `
                <input class="rc-amount" type="text" placeholder="Enter Amount..." />
            `
        }

        renderCurrencySelect () {
            return `
                <div class="rc-currency-container">
                    <select class="rc-currency">
                        <option>...</option>
                    </select>
                </div>
            `
        }

        renderTokenAmount () {
            return `
                <div class="rc-calculation">
                    <div class="rc-calculation__item">
                        <div class="rc-calculation__item-title">Total REW (incl. bonus tokens)</div>
                        <div class="rc-calculation__item-value">
                            <span class="rc-total-rew"></span>
                            REW
                        </div>
                    </div>
                    <div class="rc-calculation__item">
                        <div class="rc-calculation__item-title">BONUS Tier</div>
                        <div class="rc-calculation__item-value">
                            <span class="rc-bonus"></span>%
                        </div>
                    </div>
                </div>
            `
        }

        renderErrorPlaceholder () {
            return `
                <div class="rc-error"></div>
            `
        }

        renderSubmit () {
            return `
                <div>
                    <button class="rc-submit">Invest Now</button>
                </div>
            `
        }

        renderCurrentStage () {
            return `
                <div class="rc-current-stage">
                    <div class="rc-current-stage__name"></div>
                    <div class="rc-current-stage__min"></div>
                    <div class="rc-current-stage__dates"></div>
                </div>
            `
        }

        renderTemplate () {
            return `
                <div class="rc">
                    <div class="rc-title">
                        <a href="https://review.network" target="_blank" class="rc-title__logo"></a>
                        REW Calculator
                    </div>
                    ${this.renderCurrentStage()}
                    <div class="rc-input">
                        ${this.renderAmountInput()}
                        <div class="rc-loader-container">
                            ${this.renderLoader()}
                        </div>
                        ${this.renderCurrencySelect()}
                    </div>
                    ${this.renderTokenAmount()}
                    ${this.renderErrorPlaceholder()}
                    ${this.renderSubmit()}
                </div>
            `
        }

        setupUI () {
            this.ui = {
                $loader: document.querySelector('.rc-loader'),
                $error: document.querySelector('.rc-error'),
                $inputContainer: document.querySelector('.rc-input'),
                $amount: document.querySelector('.rc-amount'),
                $currency: document.querySelector('.rc-currency'),
                $totalRew: document.querySelector('.rc-total-rew'),
                $bonus: document.querySelector('.rc-bonus'),
                $calculation: document.querySelector('.rc-calculation'),
                $submit: document.querySelector('.rc-submit'),
                $currentStage: document.querySelector('.rc-current-stage'),
                $currentStageName: document.querySelector('.rc-current-stage__name'),
                $currentStageDates: document.querySelector('.rc-current-stage__dates'),
                $currentStageMin: document.querySelector('.rc-current-stage__min'),
            }
        }

        attachEvents () {
            let calculateTokensThrottled = throttle(e => this.calculateTokens(e), 300)
            this.ui.$currency.addEventListener('change', e => this.calculateTokens(e))
            this.ui.$amount.addEventListener('input', e => calculateTokensThrottled(e))
            this.ui.$submit.addEventListener('click', e => this.onSubmitClicked(e))
        }

        showError (message) {
            this.ui.$error.innerHTML = message
            this.ui.$error.classList.add('rc-error--visible')
        }

        hideError () {
            this.ui.$error.innerHTML = ''
            this.ui.$error.classList.remove('rc-error--visible')
        }

        startLoader () {
            this.ui.$loader.classList.add('rc-loader--visible')
        }

        stopLoader () {
            this.ui.$loader.classList.remove('rc-loader--visible')
        }

        getConversion (amount, currency) {
            return fetch(`${API_URL}/convert?currency=${currency}&amount=${amount}`)
                .then(handleErrors)
                .then(r => r.json())
        }

        calculateTokens () {
            let amount  = this.ui.$amount.value
            let currency = this.ui.$currency.value

            this.ui.$currentStageMin.innerHTML = `Min. ${this.minInvestments[currency]} ${currency}`

            this.ui.$submit.classList.remove('rc-submit--visible')
            this.ui.$calculation.classList.remove('rc-calculation--visible')

            if (!amount) {
                this.hideError()
                return
            }

            if (!parseFloat(amount, 10)) {
                this.showError('The amount must be a number.')
                return
            } else {
                this.hideError()
            }

            if (amount < this.minInvestments[currency]) {
                this.showError('The amount must be greater than the minimum investment.')
                return
            } else {
                this.hideError()
            }

            this.startLoader()

            this
                .getConversion(amount, currency)
                .then(data => {
                    let { applied_bonus: bonus, total_rew: totalRew } = data.content
                    let percentage = bonus && bonus.percentage
                    this.ui.$totalRew.innerHTML = totalRew.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    })
                    this.ui.$bonus.innerHTML = percentage || '0'
                    this.ui.$calculation.classList.add('rc-calculation--visible')
                    this.ui.$submit.classList.add('rc-submit--visible')
                    this.stopLoader()
                })
                .catch(err => {
                    this.ui.$submit.classList.remove('rc-submit--visible')
                    err.json().then(errorMessage => {
                        let errors = Object.values(errorMessage).map(errors => errors[0])
                        this.showError(errors.join(', '))
                    })
                    this.stopLoader()
                })
        }

        onSubmitClicked () {
            let amount  = this.ui.$amount.value
            
            if(!parseFloat(amount, 10)) {
                this.showError('Invalid amount')
                return
            } else {
                this.hideError()
            }

            window.location = `${DEFAULT_SUBMIT_URL}?amount=${this.ui.$amount.value}&currency=${this.ui.$currency.value}`
        }

        setInvestment (amount, currency) {
            this.ui.$amount.value = amount
            this.ui.$currency.value = currency
        }
    }

    window.RewCalculator = RewCalculator
})(window, document)