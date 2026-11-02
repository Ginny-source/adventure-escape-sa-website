function switchMainTab(targetTab) {
    const packagesTab = document.getElementById('packagesTab');
    const activitiesTab = document.getElementById('activitiesTab');
    const packagesView = document.getElementById('packagesView');
    const activitiesView = document.getElementById('activitiesView');
    const difficultyFilters = document.getElementById('difficultyFilters');
    const categoryFilters = document.getElementById('categoryFilters');

    if (targetTab === 'packages') {
        packagesTab.classList.add('active');
        activitiesTab.classList.remove('active');

        packagesView.classList.add('active');
        activitiesView.classList.remove('active');

        difficultyFilters.classList.add('active');
        categoryFilters.classList.remove('active');
    } else {
        activitiesTab.classList.add('active');
        packagesTab.classList.remove('active');

        activitiesView.classList.add('active');
        packagesView.classList.remove('active');

        categoryFilters.classList.add('active');
        difficultyFilters.classList.remove('active');
    }
}