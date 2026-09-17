const copyButtons = document.querySelectorAll( '.copy-trigger' );
const copyStatus = document.querySelector( '.copy-status' );
const menuToggle = document.querySelector( '.menu-toggle' );
const globalNavigation = document.querySelector( '.global-nav' );
const promptTabs = Array.from( document.querySelectorAll( '.prompt-tab' ) );
const promptPanels = Array.from( document.querySelectorAll( '.prompt-panel' ) );
const promptCopyButton = document.querySelector( '.prompt-copy' );

async function writeToClipboard( text ) {
	if ( navigator.clipboard && window.isSecureContext ) {
		return navigator.clipboard.writeText( text );
	}

	const textArea = document.createElement( 'textarea' );
	textArea.value = text;
	textArea.setAttribute( 'readonly', '' );
	textArea.style.position = 'fixed';
	textArea.style.opacity = '0';
	document.body.appendChild( textArea );
	textArea.select();
	const didCopy = document.execCommand( 'copy' );
	textArea.remove();

	if ( ! didCopy ) {
		throw new Error( 'Copy was not available.' );
	}
}

async function copyPrompt( button ) {
	const target = document.getElementById( button.dataset.copyTarget );

	if ( ! target ) {
		return;
	}

	try {
		await writeToClipboard( target.textContent.trim() );
		copyButtons.forEach( ( copyButton ) => {
			copyButton.classList.add( 'is-copied' );
			copyButton.querySelector( 'span' ).textContent = 'Prompt copied';
		} );

		if ( copyStatus ) {
			copyStatus.textContent = 'Copied to clipboard';
		}

		window.setTimeout( () => {
			copyButtons.forEach( ( copyButton ) => {
				copyButton.classList.remove( 'is-copied' );
				copyButton.querySelector( 'span' ).textContent = copyButton.classList.contains( 'prompt-copy' )
					? 'Copy prompt'
					: 'Copy the starter prompt';
			} );

			if ( copyStatus ) {
				copyStatus.textContent = 'Ready to copy';
			}
		}, 2400 );
	} catch ( error ) {
		if ( copyStatus ) {
			copyStatus.textContent = 'Select the prompt and copy it';
		}
		target.focus?.();
	}
}

copyButtons.forEach( ( button ) => {
	button.addEventListener( 'click', () => copyPrompt( button ) );
} );

function activatePromptTab( tab ) {
	const targetId = tab.dataset.promptTarget;

	promptTabs.forEach( ( promptTab ) => {
		const isActive = promptTab === tab;
		promptTab.classList.toggle( 'is-active', isActive );
		promptTab.setAttribute( 'aria-selected', String( isActive ) );
		promptTab.tabIndex = isActive ? 0 : -1;
	} );

	promptPanels.forEach( ( panel ) => {
		panel.hidden = panel.id !== targetId;
	} );

	if ( promptCopyButton ) {
		promptCopyButton.dataset.copyTarget = targetId;
	}

	if ( copyStatus ) {
		copyStatus.textContent = 'Ready to copy';
	}
}

promptTabs.forEach( ( tab, index ) => {
	tab.addEventListener( 'click', () => activatePromptTab( tab ) );
	tab.addEventListener( 'keydown', ( event ) => {
		let nextIndex;

		if ( event.key === 'ArrowRight' ) {
			nextIndex = ( index + 1 ) % promptTabs.length;
		} else if ( event.key === 'ArrowLeft' ) {
			nextIndex = ( index - 1 + promptTabs.length ) % promptTabs.length;
		} else if ( event.key === 'Home' ) {
			nextIndex = 0;
		} else if ( event.key === 'End' ) {
			nextIndex = promptTabs.length - 1;
		} else {
			return;
		}

		event.preventDefault();
		activatePromptTab( promptTabs[ nextIndex ] );
		promptTabs[ nextIndex ].focus();
	} );
} );

if ( menuToggle && globalNavigation ) {
	menuToggle.addEventListener( 'click', () => {
		const isOpen = menuToggle.getAttribute( 'aria-expanded' ) === 'true';
		menuToggle.setAttribute( 'aria-expanded', String( ! isOpen ) );
		globalNavigation.classList.toggle( 'is-open', ! isOpen );
	} );

	globalNavigation.addEventListener( 'click', ( event ) => {
		if ( event.target.closest( 'a' ) ) {
			menuToggle.setAttribute( 'aria-expanded', 'false' );
			globalNavigation.classList.remove( 'is-open' );
		}
	} );
}
