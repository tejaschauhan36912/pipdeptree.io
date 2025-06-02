document.addEventListener('DOMContentLoaded', () => {
    const packageInput = document.getElementById('packageInput');
    const addPackageBtn = document.getElementById('addPackageBtn');
    const selectedPackagesContainer = document.getElementById('selectedPackages');
    const dependenciesOutput = document.getElementById('dependenciesOutput');
    const copyBtn = document.getElementById('copyBtn');
    const loadingSpinner = document.getElementById('loading');
    const errorMessage = document.getElementById('error');

    let selectedPackageNames = new Set(); // Using a Set for unique package names

    // Regex for valid PyPI package names (letters, numbers, underscores, hyphens, periods)
    // and must not be empty.
    const pypiPackageNameRegex = /^[a-z0-9_.-]+$/i; // Case-insensitive for input validation

    // --- Event Listeners ---
    addPackageBtn.addEventListener('click', addPackage);
    packageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addPackage();
        }
    });
    copyBtn.addEventListener('click', copyDependenciesToClipboard);

    // --- Functions ---

    function addPackage() {
        const packageName = packageInput.value.trim();
        clearError();

        if (!packageName) {
            displayError('Please enter a package name.');
            return;
        }

        // Validate package name syntax before adding
        if (!pypiPackageNameRegex.test(packageName)) {
            displayError('Invalid package name format. Use only letters, numbers, hyphens, underscores, or periods.');
            packageInput.value = ''; // Clear input for invalid entry
            return;
        }
        
        // Normalize to lowercase for internal tracking (PyPI names are case-insensitive)
        const normalizedPackageName = packageName.toLowerCase();

        if (selectedPackageNames.has(normalizedPackageName)) {
            displayError(`'${packageName}' is already added.`);
            packageInput.value = '';
            return;
        }

        selectedPackageNames.add(normalizedPackageName); // Add normalized name to Set
        renderSelectedPackages();
        fetchDependenciesForSelectedPackages();
        packageInput.value = ''; // Clear input field
    }

    function removePackage(packageNameToRemove) {
        selectedPackageNames.delete(packageNameToRemove);
        renderSelectedPackages();
        fetchDependenciesForSelectedPackages();
    }

    function renderSelectedPackages() {
        selectedPackagesContainer.innerHTML = '';
        selectedPackageNames.forEach(packageName => {
            const tag = document.createElement('div');
            tag.classList.add('package-tag');
            // Display the original casing if you prefer, but internally use normalized name
            tag.innerHTML = `
                <span>${packageName}</span> 
                <button class="close-btn" data-package="${packageName}"><i class="fas fa-times"></i></button>
            `;
            selectedPackagesContainer.appendChild(tag);

            // Add event listener for the close button
            tag.querySelector('.close-btn').addEventListener('click', (e) => {
                removePackage(e.currentTarget.dataset.package);
            });
        });
    }

    async function fetchDependenciesForSelectedPackages() {
        dependenciesOutput.textContent = ''; // Clear previous output
        clearError();

        if (selectedPackageNames.size === 0) {
            dependenciesOutput.textContent = '# Add package names to see dependencies.';
            return;
        }

        loadingSpinner.style.display = 'block'; // Show spinner

        const results = [];
        for (const packageName of selectedPackageNames) {
            const url = `https://pypi.org/pypi/${packageName}/json`;
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    if (response.status === 404) {
                        results.push(`# Error: Package '${packageName}' not found on PyPI.`);
                    } else {
                        // Generic HTTP error that's not 404
                        results.push(`# Error fetching '${packageName}': HTTP Status ${response.status}`);
                    }
                    continue; // Skip to next package
                }
                const data = await response.json();
                const requiresDist = data.info.requires_dist;

                results.push(`\n# Dependencies for ${packageName} (latest version):`);
                if (requiresDist && requiresDist.length > 0) {
                    // Sort dependencies alphabetically for consistent output
                    requiresDist.sort().forEach(dep => results.push(dep));
                } else {
                    results.push(`No direct dependencies found.`);
                }

            } catch (error) {
                // Network errors or JSON parsing errors
                results.push(`# Network Error fetching '${packageName}': ${error.message}`);
                console.error(`Error fetching ${packageName}:`, error);
            }
        }
        loadingSpinner.style.display = 'none'; // Hide spinner
        dependenciesOutput.textContent = results.join('\n');
    }

    async function copyDependenciesToClipboard() {
        const textToCopy = dependenciesOutput.textContent;
        if (!textToCopy.trim() || textToCopy.trim() === '# Add package names to see dependencies.') {
            displayError('Nothing to copy!');
            return;
        }

        try {
            await navigator.clipboard.writeText(textToCopy);
            copyBtn.textContent = 'Copied!';
            copyBtn.classList.add('copied');
            setTimeout(() => {
                copyBtn.textContent = 'Copy to Clipboard';
                copyBtn.classList.remove('copied');
            }, 2000);
        } catch (err) {
            displayError('Failed to copy. Please copy manually.');
            console.error('Failed to copy: ', err);
        }
    }

    function displayError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }

    function clearError() {
        errorMessage.textContent = '';
        errorMessage.style.display = 'none';
    }

    // Initial message
    dependenciesOutput.textContent = '# Start typing package names above and hit Enter or click \'Add Package\'\n\n# Dependencies will appear here, grouped by package.';
});