export interface PageState {
    isDirty: () => boolean;
    save: () => Promise<void>;
}

let pageState: PageState | null = null;

export function usePageStateProvider() {
    // 注册页面状态
    function setPageState(state: PageState) {
        pageState = state;
    }
    // 清理页面状态
    function clearPageState() {
        pageState = null;
    }
    // 判断页面是否有未保存更改
    function isPageDirty() {
        return pageState?.isDirty ? pageState.isDirty() : false;
    }
    // 保存页面
    async function savePage() {
        if (pageState?.save) {
            await pageState.save();
        }
    }
    return {
        setPageState,
        clearPageState,
        isPageDirty,
        savePage
    };
}
