const copyButtons = document.querySelectorAll( '.copy-trigger' );
const copyStatus = document.querySelector( '.copy-status' );
const menuToggle = document.querySelector( '.menu-toggle' );
const globalNavigation = document.querySelector( '.global-nav' );

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
